 const express = require("express");
  const app = express();
  const morgan = require("morgan");
  const bodyParser = require("body-parser");
  const mongoose = require("mongoose");
  const userRoutes = require('./routes/user');
  const cors=require('cors');
  const {MongoClient} = require('mongodb');
 const connectDB = require('./DB/Connection');

connectDB();
const Port = process.env.Port || 1000;

app.listen(Port,()=>console.log("server started"));


 //let db="mongodb+srv://maestroApplication:BACk1ENd1@cluster0-zwzxg.mongodb.net/MaestroApp?retryWrites=true&w=majority"
 let db="mongodb://localhost/MaestroApp"
  /* mongoose
    .connect(db, {
      useCreateIndex: true,
      useNewUrlParser: true,
      useFindAndModify:false,
      useUnifiedTopology: true
    })
    .then(() => winston.info(`Connected to MongoDB...`))*/
    //const mongoConnectionSettings = config.read();
   // const migrated = up(db, client);
    //migrated.forEach(fileName => console.log('Migrated:', fileName));
 
 
  mongoose.connect(db, { useNewUrlParser: true ,useUnifiedTopology: true ,useCreateIndex: true  }).
  catch(error => handleError(error));
  mongoose.set('useFindAndModify', false);

  mongoose.Promise = global.Promise;
 
  app.use('/uploads', express.static('uploads'));
  app.use('/images', express.static('/images'));
  app.use(morgan("dev"));
  app.use('/uploads', express.static('uploads'));
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  app.use(cors());

  /*app.use(cors({
   origin:"http://3.137.69.49/",
   credentials:true
  }))*/
  
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    );
    if (req.method === "OPTIONS") {
      res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
      return res.status(200).json({});
    }
    next();
  });
  
  // Routes which should handle requests


  app.use("/user", userRoutes);

  
  app.use((req, res, next) => {
    const error = new Error("the request you want isn't supported yet");
    error.status = 404;
    next(error);
  });
  
  app.use((error, req, res, next) => {
    res.status(error.status || 500);
    res.json({
      error: {
        message: error.message
      }
    });
  });
  
  module.exports = app;


