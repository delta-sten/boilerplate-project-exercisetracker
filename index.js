const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');
const { Schema } = mongoose;

mongoose.connect(process.env.MONGO_URI);

const UserSchema = new Schema({
  username: String,
});
const User = mongoose.model("User", UserSchema);

const ExerciseSchema = new Schema({
  user_id: {type: String, required: true },
  description: String,
  duration: Number,
  date: Date,
});
const Exercise = mongoose.model("Exercise", ExerciseSchema);

app.use(cors())
app.use(express.static('public'))
app.use(express.urlencoded({extended: true}));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get("/api/users", async (req, res) => {
  const users = await User.find({}).select("_id username");
  if (!users) {
    res.send("No users");
  }else {
    res.json(users);
  }
})

app.post("/api/users", async (req, res) => {
  //console.log("req.body: " + req.body);
  const userObj = new User({
    username: req.body.username,
  });

  try{
    const user = await userObj.save();
    //console.log("user: " + user); /* 8:57 */
    res.json(user);
  }catch(err){
    console.log(err);
  }

})

app.post("/api/users/:_id/exercises", async (req, res) => {
  const checkDate = (date) => {
    if (!date) {
      return (new Date(Date.now())).toDateString();
    } else {
      let dateString;
      if (typeof date === 'string') {
        dateString = date;
      } else if (date instanceof Date) {
        dateString = date.toISOString().split('T')[0];
      }
      const parts = dateString.split('-');
      const year = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1;
      const day = parseInt(parts[2]);
      const utcDate = new Date(Date.UTC(year, month, day));
      return new Date(utcDate.getTime() + utcDate.getTimezoneOffset() * 60000).toDateString();
    }
  }
  const id = req.params._id;
  const { description, duration, date } = req.body

  try {
    const user = await User.findById(id)
    if (!user) {
      res.send("Could not find user")
    } else {
      const exerciseObj = new Exercise({
        user_id: user._id,
        description,
        duration,
        date: checkDate(date)
      })
      const exercise = await exerciseObj.save()

      res.json({
        username: user.username,
        description: exercise.description,
        duration: Number(exercise.duration),
        date: checkDate(exercise.date),
        _id: user._id
      })
    }
  }catch(err){
    console.log(err);
    res.send("There was an error saving the exercise")
  }
})


app.get("/api/users/:_id/logs", async (req, res) => {
  const {from, to, limit } = req.query;
  const id = req.params._id;
  const user = await User.findById(id);
  if (!user) {
    res.send("Could not find user");
    return;
  }
  let dateObj = {};
  if (from) {
    dateObj["$gte"] = new Date(from);
  }
  if (to) {
    dateObj["$lte"] = new Date(to);
  }
  let filter = {
    user_id: id
  }
  if (from || to) {
    filter.date = dateObj;
  }

  const exercises = await Exercise.find(filter).limit(+limit ?? 500);

  const log = exercises.map(e => ({
    description: e.description,
    duration: e.duration,
    date: e.date.toDateString()
  }))

  res.json({
    username: user.username,
    count: exercises.length,
    _id: user._id,
    log
  })
})



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
