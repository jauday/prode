def calculate_points(
    pred_home: int, pred_away: int,
    real_home: int, real_away: int,
) -> int:
    if real_home is None or real_away is None:
        return 0

    exact_home = pred_home == real_home
    exact_away = pred_away == real_away

    def result(h, a):
        if h > a:
            return "H"
        if h < a:
            return "A"
        return "D"

    correct_result = result(pred_home, pred_away) == result(real_home, real_away)

    if exact_home and exact_away:
        return 12
    if correct_result and (exact_home or exact_away):
        return 7
    if correct_result:
        return 5
    if exact_home or exact_away:
        return 2
    return 0
