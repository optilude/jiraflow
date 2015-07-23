# Borrowed from matplotlib to avoid having to depend on it to get `date2num()`

import numpy as np
from dateutil.rrule import SECONDLY, MO, TU, WE, TH, FR, SA, SU

MICROSECONDLY = SECONDLY + 1
HOURS_PER_DAY = 24.
MINUTES_PER_DAY = 60. * HOURS_PER_DAY
SECONDS_PER_DAY = 60. * MINUTES_PER_DAY
MUSECONDS_PER_DAY = 1e6 * SECONDS_PER_DAY
SEC_PER_MIN = 60
SEC_PER_HOUR = 3600
SEC_PER_DAY = SEC_PER_HOUR * 24
SEC_PER_WEEK = SEC_PER_DAY * 7
MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY = (
    MO, TU, WE, TH, FR, SA, SU)
WEEKDAYS = (MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY)

def iterable(obj):
    'return true if *obj* is iterable'
    try:
        iter(obj)
    except TypeError:
        return False
    return True

def _to_ordinalf(dt):
    """
    Convert :mod:`datetime` to the Gregorian date as UTC float days,
    preserving hours, minutes, seconds and microseconds.  Return value
    is a :func:`float`.
    """

    if hasattr(dt, 'tzinfo') and dt.tzinfo is not None:
        delta = dt.tzinfo.utcoffset(dt)
        if delta is not None:
            dt -= delta

    base = float(dt.toordinal())
    if hasattr(dt, 'hour'):
        base += (dt.hour / HOURS_PER_DAY + dt.minute / MINUTES_PER_DAY +
                 dt.second / SECONDS_PER_DAY +
                 dt.microsecond / MUSECONDS_PER_DAY
                 )
    return base

_to_ordinalf_np_vectorized = np.vectorize(_to_ordinalf)

def date2num(d):
    """

    *d* is either a :class:`datetime` instance or a sequence of datetimes.
    Return value is a floating point number (or sequence of floats)
    which gives the number of days (fraction part represents hours,
    minutes, seconds) since 0001-01-01 00:00:00 UTC, *plus* *one*.
    The addition of one here is a historical artifact.  Also, note
    that the Gregorian calendar is assumed; this is not universal
    practice.  For details, see the module docstring.
    """
    if not iterable(d):
        return _to_ordinalf(d)
    else:
        d = np.asarray(d)
        if not d.size:
            return d
        return _to_ordinalf_np_vectorized(d)
