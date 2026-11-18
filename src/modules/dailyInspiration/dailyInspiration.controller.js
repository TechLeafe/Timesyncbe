
const dailyInspirationService = require("./dailyInspiration.service");

const getDailyInspiration = async (req, res, next) => {
  try {
    const inspiration =
      await dailyInspirationService.getDailyInspiration();

    return res.status(200).json({
      success: true,
      data: inspiration,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDailyInspiration,
};
