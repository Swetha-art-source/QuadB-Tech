const mongoose = require('mongoose');

// Replace 'your-database-uri' with your MongoDB connection string
const mongoURI = process.env.URI;

mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log(err));

module.exports = mongoose;
