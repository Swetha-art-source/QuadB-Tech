const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('./models/User'); 
const multer = require('multer');
const path = require('path');
const db = require('./db');

const app = express();

app.use(bodyParser.json());

// Authentication Middleware
const authenticateJWT = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    if (authHeader.startsWith("Bearer ")) {
      jwtToken = authHeader.substring(7); 
    }
  }
  console.log("Received Token:", jwtToken);
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "a3c4006cba9b28680bfd3aebf6c8e4582e22a917886d1c5edcc5424ca8358180", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        // The token is valid, and `payload` contains the data from the token.
        // You can access `payload.user_id` to get the user ID, for example.
        request.user = payload; // Store the payload in the request object for later use
        next();
      }
    });
  }
};

const updateLastLoggedIn = async (req, res, next) => {
  try {
    // Ensure req.user is defined and has a user_id property
    console.log('req.body:', req.body);
    console.log('req.user:', req.user);

    if (!req.body || !req.user.user_id) {
      throw new Error('Invalid user object');
    }
    
    console.log('Middleware: user_id from JWT:', req.user.user_id); // Add this line for debugging

    await User.updateOne(
      { $set: { last_logged_in: new Date() } },
      { where: { user_id: req.body.user_id } }

    );
    console.log('Middleware: last_logged_in updated successfully'); // Add this line for debugging
    next();
  } catch (error) {
    console.error('Error updating last_logged_in:', error);
    next(); // Proceed even if there's an error
  }
};



const storage = multer.diskStorage({
  destination: function (req, file, cb) {
      cb(null, './user_image');
  },
  filename: function (req, file, cb) {
      cb(null, uuidv4() + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });


// API Routes

// GET user details by user_id
app.get('/details/:user_id', async (req, res) => {
  const user_id = req.params.user_id;

  try {
    // Find the user by user_id
    const user = await User.findOne({ user_id });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user_details: user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST insert a new user
app.post('/insert', upload.single('user_image'), async (req, res) => {
  const newUser = req.body.user_details;

  // Hash the user's password before storing it
  bcrypt.hash(newUser.user_password, 10, async (err, hash) => {
    if (err) {
      return res.status(500).json({ error: err });
    }

    newUser.user_password = hash;

    try {
      const createdUser = await User.create({
        user_id: newUser.user_id,
        user_name: newUser.user_name,
        user_email: newUser.user_email,
        user_password: newUser.user_password,
        user_image: req.file ? req.file.filename : null,
        total_orders: newUser.total_orders,
      });

      // Generate a JWT token for the newly created user
      const secretKey = 'a3c4006cba9b28680bfd3aebf6c8e4582e22a917886d1c5edcc5424ca8358180';
      const token = jwt.sign({ user_id: createdUser.user_id }, secretKey, { expiresIn: '1h' });

      res.json({ message: 'User created successfully', token: token });
    } catch (error) {
      res.status(400).json({ message: 'User creation failed', error: error.message });
    }
  });
});

// PUT update user details
app.put('/update', authenticateJWT,updateLastLoggedIn, async (req, res) => {
  const newDetails = req.body;
  const userId = newDetails.user_id;

  try {
    // Use Mongoose to update the user details
    await User.findOneAndUpdate({ user_id: userId }, newDetails);

    res.json({ message: 'User details updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// GET user image by user_id
app.get('/image/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const user = await User.findOne({ user_id });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.user_image) {
      return res.status(404).json({ message: 'User image not found' });
    }

    res.setHeader('Content-Type', 'image/jpeg'); // Adjust content type as needed
    res.sendFile(path.join(__dirname, 'user_image', user.user_image));
  } catch (error) {
    console.error('Error retrieving user image:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// DELETE user by user_id
app.delete('/delete/:user_id', async (req, res) => {
  const user_id = req.params.user_id;

  try {
    const deletedUser = await User.findOneAndRemove({ user_id });

    if (deletedUser) {
      res.json({ message: 'User deleted successfully' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});


// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
