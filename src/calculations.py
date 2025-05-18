import math


class Calculations:

    @staticmethod
    def squares_diff(x1, x2):
        return x1 ** 2 - x2 ** 2

    @staticmethod
    def trapezoid_mf(x, params):
        a, b, c, d = params
        numerator1 = (x - a)
        denominator1 = (b - a) or 1e-5
        numerator2 = (d - x)
        denominator2 = (d - c) or 1e-5

        return max(0, min(
            numerator1 / denominator1,
            1.0,
            numerator2 / denominator2
        ))

    @staticmethod
    def triangle_mf(x, params):
        a, b, c = params
        numerator1 = (x - a)
        denominator1 = (b - a) or 1e-5
        numerator2 = (c - x)
        denominator2 = (c - b) or 1e-5

        return max(0, min(
            numerator1 / denominator1,
            numerator2 / denominator2
        ))

    @staticmethod
    def distance(a, b):
        return math.sqrt((a["x"] - b["x"]) ** 2 + (a["y"] - b["y"]) ** 2)

    @staticmethod
    def calculate_angle(fr, to):
        return math.atan2(to["y"] - fr["y"], to["x"] - fr["x"]) * 180 / math.pi

    @staticmethod
    def normalize_angle(angle):
        while angle > 180:
            angle -= 360
        while angle < -180:
            angle += 360
        return angle

    @staticmethod
    def radian(angle):
        return math.radians(angle)

    @staticmethod
    def cos(angle):
        return math.cos(angle)

    @staticmethod
    def sin(angle):
        return math.sin(angle)
