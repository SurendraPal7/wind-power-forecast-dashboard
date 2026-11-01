import pytest
import httpx
from unittest.mock import MagicMock, patch
from app.services.elexon_client import ElexonClient, ElexonAPIError


def test_client_initialization():
    client = ElexonClient(base_url="https://test.elexon.co.uk", timeout=10.0, max_retries=2)
    assert client.base_url == "https://test.elexon.co.uk"
    assert client.timeout == 10.0
    assert client.max_retries == 2


def test_fetch_stream_success_list():
    client = ElexonClient(max_retries=1)
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = [{"startTime": "2026-01-01T00:00:00Z", "generation": 1000}]

    with patch.object(client, "_get_client") as mock_get_client:
        mock_http_client = MagicMock()
        mock_http_client.get.return_value = mock_response
        mock_get_client.return_value.__enter__.return_value = mock_http_client

        records = client.fetch_stream("FUELHH", params={"fuelType": "WIND"}, use_cache=False)
        assert len(records) == 1
        assert records[0]["generation"] == 1000


def test_fetch_stream_wrapped_dict():
    client = ElexonClient(max_retries=1)
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"data": [{"startTime": "2026-01-01T00:00:00Z", "generation": 2500}]}

    with patch.object(client, "_get_client") as mock_get_client:
        mock_http_client = MagicMock()
        mock_http_client.get.return_value = mock_response
        mock_get_client.return_value.__enter__.return_value = mock_http_client

        records = client.fetch_stream("FUELHH", use_cache=False)
        assert len(records) == 1
        assert records[0]["generation"] == 2500


def test_fetch_stream_retry_on_503():
    client = ElexonClient(max_retries=2, backoff_factor=0.01)
    mock_fail = MagicMock()
    mock_fail.status_code = 503

    mock_success = MagicMock()
    mock_success.status_code = 200
    mock_success.json.return_value = [{"startTime": "2026-01-01T00:00:00Z", "generation": 1200}]

    with patch.object(client, "_get_client") as mock_get_client:
        mock_http_client = MagicMock()
        mock_http_client.get.side_effect = [mock_fail, mock_success]
        mock_get_client.return_value.__enter__.return_value = mock_http_client

        records = client.fetch_stream("WINDFOR", use_cache=False)
        assert len(records) == 1
        assert mock_http_client.get.call_count == 2


def test_fetch_stream_error_on_404():
    client = ElexonClient(max_retries=1)
    mock_response = MagicMock()
    mock_response.status_code = 404
    mock_response.text = "Not Found"

    with patch.object(client, "_get_client") as mock_get_client:
        mock_http_client = MagicMock()
        mock_http_client.get.return_value = mock_response
        mock_get_client.return_value.__enter__.return_value = mock_http_client

        with pytest.raises(ElexonAPIError) as exc_info:
            client.fetch_stream("UNKNOWN_DATASET", use_cache=False)
        assert exc_info.value.status_code == 404
