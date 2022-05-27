const connectToMongo = require("./db");
const express = require("express");
var cors = require('cors')
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
var jwt = require("jsonwebtoken");
const User = require("../backend/models/User");

const JWT_Secret = "Faq$Management@'System";

connectToMongo();
const app = express();
const port = 5000;

app.use(cors())

app.use(express.json())
app.use(express.urlencoded({extended: false}))
app.set("view engine", "ejs")

app.use("/api/auth", require("./routes/auth"));
app.use("/api/faq", require("./routes/faq"));

app.get('/', (req, res) => {
  res.send("Hello World!!");
});

//forgot-password:GET: /http://localhost:5000/forgot-password
app.get("/forgot-password",(req,resp)=>{
  resp.render("../backend/views/forgot-password.ejs")
});

//forgot-password:POST: /http://localhost:5000/forgot-password
app.post("/forgot-password",async(req,resp)=>{
  const {email} = req.body;
  let user = await User.findOne({email: req.body.email})

  //check weather the user is not null , if null return error else generate token
  if(user === null)
  {
    if(email !== user)
    {
      return resp.status(400).json({success: false, error: "User Not Registred"})
    }
  }
  //user is valid then create a one time password linkfor 10min
  const secret = JWT_Secret + user.password;
  const payload = {
    id: user._id,
    email: user.email
  }
  const token = jwt.sign(payload,secret,{expiresIn: "10m"})
  const link  = `http://localhost:5000/reset-password/${user._id}/${token}`
  //sending the link in console
  console.log(link);
  resp.send("The Link has been send to Console. Please follow/Click the link in console")
});

//Reset the password GET ./http://localhost:5000/reset-password
app.get("/reset-password/:id/:token", async (req, resp) => {
  let user = await User.findOne({
    id: req.body._id,
  });
  const { id, token } = req.params;
  //checking wether id exists or not in db
  if (id !== user.id) {
    return resp.send("Invalid Id. Please try Again with correct Cred");
  }
  //We have Valid Id and Valid User with this Id
  const secret = JWT_Secret + user.password;
  try {
    const payload = jwt.verify(token, secret);
    resp.render("../backend/views/reset-password.ejs");
  } catch (error) {
    console.log(error.message);
    resp.send(error.message);
  }
});

//Reset the password POST. /http://localhost:5000/reset-password

app.post("/reset-password/:id/:token",async(req,resp)=>{
  let user = await User.findOne({id : req.body._id})
  const {id,token} = req.params;
  const {password,password2} = req.body;
  //check if user exists in db
  if(id !== user.id){
    return resp.send("Invalid Id . Please Try Again")
  }
  const secret = JWT_Secret + user.password;
  try {
    const payload = jwt.verify(token, secret);
    //if error found return bad req and errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return resp.status(400).json({ success: false, errors: errors.array() });
    }
    // Validate password both password match procced further with payload email and id  and update with new password
    if(password === null && password2 === null)
    {
      resp.send("Password and Confirm Password should not be null")
    }
    if(password !== password2)
    {
      resp.send("please check Password & Confirm Password")
    }
    else{
      //we find the user with payload emailand id update password
      //hasing the new password
      const salt = await bcrypt.genSalt(10);
      const secPass = await bcrypt.hash(password, salt);
      user.password = secPass;
      user.save();
      resp.send("Password has been Updated")
    }
  } catch (error) {
    console.log(error.message);
    resp.send(error.message);
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port : http://localhost:${port}`);
});