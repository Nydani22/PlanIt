const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  //console.log("Header:", authHeader);
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);
  jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
    if (err) {
      //console.log(err.message);
      return res.sendStatus(403);
    }
    req.user = user;
    next();
  });
}

/*
function isAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.sendStatus(403);
  }
  next();
}

module.exports = { authenticateToken, isAdmin };

Ha lesz admin az oldalon (aminek még nem látom fontosságát, mert nincs rá szükség)
*/

module.exports =  authenticateToken;