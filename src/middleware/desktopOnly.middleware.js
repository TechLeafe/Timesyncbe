
const desktopOnly = (req, res, next) => {
  const userAgent = req.headers["user-agent"] || "";

  const mobileRegex =
    /Android|iPhone|iPad|iPod|Mobile|Windows Phone|webOS|BlackBerry|Opera Mini/i;

  const isMobile = mobileRegex.test(userAgent);

  const isIPad =
    /Macintosh/i.test(userAgent) &&
    req.headers["sec-ch-ua-mobile"] === "?1";

  if (isMobile || isIPad) {
    return res.status(403).json({
      success: false,
      message:
        "Check In and Check Out are allowed only on laptops and desktop computers.",
    });
  }

  next();
};

module.exports = desktopOnly;
