from typing import Optional
from datetime import datetime, date, time, timedelta, timezone
from pydantic import BaseModel, Field
from app.utils.datetime_utils import to_utc_datetime


class DecisionCutoffPolicy(BaseModel):
    """
    Configuration policy defining when electricity purchasing decisions are locked in
    relative to physical electricity delivery.
    
    Standard UK Market Context:
      In the UK wholesale power market (e.g. EPEX SPOT and Nord Pool UK Day-Ahead hourly/half-hourly auctions),
      orders for delivery on Day D are closed on Day D-1.
      The auction order book closes at 11:00 UTC (12:00 CET / 11:00 GMT).
      Therefore, purchasing decisions are finalized using the latest forecast available prior to 11:00 UTC on D-1.
    """
    policy_name: str = Field(
        default="UK_DAY_AHEAD_AUCTION",
        description="Descriptive identifier for the decision cutoff policy"
    )
    cutoff_time_utc: str = Field(
        default="11:00",
        description="Clock time in UTC on the decision day when cutoff occurs (HH:MM)"
    )
    day_offset: int = Field(
        default=1,
        description="Days prior to delivery when decision is finalized (1 = Day D-1)"
    )
    description: str = Field(
        default="Standard UK Day-Ahead wholesale market gate closure (default: 11:00 UTC on D-1)",
        description="Detailed domain explanation of the cutoff assumption"
    )

    def parse_time(self) -> time:
        parts = self.cutoff_time_utc.strip().split(":")
        return time(hour=int(parts[0]), minute=int(parts[1]))

    def calculate_cutoff_datetime(self, delivery_dt_or_date: datetime | date | str) -> datetime:
        """
        Calculates the exact decision cutoff UTC datetime for a target delivery interval or date.
        
        Example:
          For target delivery interval 2026-01-02T14:00:00Z:
          With day_offset = 1 and cutoff_time_utc = '11:00':
          Cutoff is 2026-01-01T11:00:00Z.
        """
        if isinstance(delivery_dt_or_date, str):
            delivery_dt = to_utc_datetime(delivery_dt_or_date)
        elif isinstance(delivery_dt_or_date, datetime):
            delivery_dt = to_utc_datetime(delivery_dt_or_date)
        else:
            delivery_dt = datetime(
                delivery_dt_or_date.year,
                delivery_dt_or_date.month,
                delivery_dt_or_date.day,
                0, 0, 0,
                tzinfo=timezone.utc
            )

        c_time = self.parse_time()
        decision_date = delivery_dt.date() - timedelta(days=self.day_offset)
        return datetime(
            decision_date.year,
            decision_date.month,
            decision_date.day,
            c_time.hour,
            c_time.minute,
            0,
            tzinfo=timezone.utc
        )


# Default system policy instance
DEFAULT_POLICY = DecisionCutoffPolicy()
