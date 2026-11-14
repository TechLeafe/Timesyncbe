
const service = require("./monthlyAchievement.service");

const getAchievement = async (req, res, next) => {
  try {
    const { month, year } = req.query;

    const data = await service.getAchievement(
      month,
      year
    );

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
};

const saveAchievement = async (req, res, next) => {
  try {
    const selectedBy = String(
      req.user?.user_id ||
      req.user?.userId ||
      req.user?.id ||
      req.user?.employeeId ||
      ""
    );

    if (!selectedBy) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user ID unavailable",
      });
    }

    const data = await service.saveAchievement(
      req.body,
      selectedBy
    );

    res.status(200).json({
      success: true,
      message: "Monthly Achievement declared successfully",
      data,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Achievement conflict. Please retry.",
      });
    }

    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
};

module.exports = {
  getAchievement,
  saveAchievement,
};
