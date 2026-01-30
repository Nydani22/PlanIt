const service = require('../services/example.service');

exports.getExample = (req, res) => {
  const data = service.getData();
  res.json(data);
};
