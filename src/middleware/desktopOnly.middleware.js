
const desktopOnly = (req, res, next) => {
  const userAgent = req.headers["user-agent"] || "";
  const clientPlatform = req.headers["sec-ch-ua-platform"] || "";
  const mobileHint = req.headers["sec-ch-ua-mobile"] === "?1";

  const mobileRegex =
    /Android|iPhone|iPad|iPod|Mobile|Windows Phone|webOS|BlackBerry|Opera Mini/i;

  const isMobile =
    mobileRegex.test(userAgent) ||
    /Android|iOS/i.test(clientPlatform) ||
    mobileHint;

  const isIPad =
    /Macintosh/i.test(userAgent) &&
    req.headers["sec-ch-ua-mobile"] === "?1";

  if (isMobile || isIPad) {
    return res.status(403).json({
      success: false,
      message:
        "Access is allowed only from a laptop or desktop computer.",
    });
  }

  next();
};

module.exports = desktopOnly;
