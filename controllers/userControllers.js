/**
*@module controllers/userControllers
*/

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');//this used for hashing the passwords to provide more secuirty
const jwt = require('jsonwebtoken');
const Joi = require('joi')
const User = require('../models/User')
const env = require('dotenv').config();
const nodemailer = require("nodemailer");
const RandHash =require('../models/RandHash');// put randam hash in url in verify mail
var randomHash = require('random-key');
var mailOptions;
const rand =new RandHash;


/**
* UserController signup valdiation
*@memberof module:controllers/userControllers
*@param {object}   req.body
*@param {string}   req.body.email     you enter user email should be vaild and real
*@param {string}   req.body.password  you put password  min 8 characters and max is 80
*@param {string}   req.body.name      you enter user name min 3 letters and max 30
*@param {date}     req.body.birthDate   you enter user birthdate min 1900
*@param {boolean}  req.body.gender    you enter user gender true for female and false for male 
*/

 function joiValidate (req) {
const schema = {
    email: 
    Joi.string().email().lowercase().required(),
    password: 
    Joi.string().min(8).max(80).alphanum().required(),
    name: 
    Joi.string().min(3).max(30).required(),
    birthDate:
    Joi.date().required().min('1-1-1900').iso(),
    gender:
    Joi.boolean().required(),

}
	return Joi.validate(req, schema);
};
exports.validateSignUp = joiValidate;


/**
* UserController random hash generator
*@memberof module:controllers/userControllers
*@param {schema}  rand
*@param {string}  rand.randNo  it generates random string of legnth 50
 */
function randGenerator(){
  rand.randNo = randomHash.generate(50);
}

const smtpTransport = nodemailer.createTransport({
  service: 'gmail',
   port: 8000,
   secure: false,
   auth: {
      user: process.env.MAESTROEMAIL,//change 
      pass: process.env.PASSWORD
  } 
});
/**
* UserController signup 
*@memberof module:controllers/userControllers
*@function userSignup 
*@param {function} joiValidate          Function for validate data
*@param {object}  req      Express request object
*@param {string}  req.body.email     you enter user email should be vaild and real
*@param {string}  req.body.password  you put password  min 8 characters and max is 80
*@param {string}  req.body.name      you enter user name min 3 letters and max 30
*@param {date}    req.body.birthDate   you enter user birthdate min 1900
*@param {boolean} req.body.gender    you enter user gender true for female and false for male
*@param {object}  res 
*@param {status}  res.status       if error  it returns status of 400 ,409 ,500/ if success it returns status of 201 
*@param {string}  res.message      the type of error /user created successfully
*@param {token}   res.token   it returns token if user sigup successfully
 */
exports.userSignup =   (req, res, next) => {
  const { error } = joiValidate(req.body)
  if (error)
   return res.status(400).send({ message: error.details[0].message });
   //this object is created for LikedSongLibrary
  let userId;
  User.find({ name: req.body.name  })
  .exec()
   .then(user => {
     if (user.length >= 1) {
       return res.status(409).json({
         message: 'Username already exists'
       });
     }  
     else {
           bcrypt.hash(req.body.password, 10, (err, hash) => {
             if (err) {
               return res.status(500).json({
                 error: err
               });
             } else {
              randGenerator();
              const host = req.get('host');//just our locahost
              const link="http://"+host+"/user/verify?id="+rand.randNo;
              mailOptions={
                   from: 'Do Not Reply '+process.env.MAESTROEMAIL,
                   to : req.body.email,//put user email
                   subject : "Please confirm your Email account",
                   html : "Hello,<br> Please Click on the link to verify your email.<br><a href="+link+">Click here to verify</a>"
               }
              console.log(mailOptions);
              smtpTransport.sendMail(mailOptions,async function(error, response){
              if(error){
                 console.log(error);
                 return res.status(500).send({ msg: 'Unable to send email' });     
                 
              }else{
                     //here that the message send successfulyy so the user can sign up  
                     const user = new User({
                       _id: new mongoose.Types.ObjectId(),
                       name:req.body.name,
                       email: req.body.email,
                       password: hash,
                       birthDate:req.body.birthDate,
                       gender:req.body.gender,
                     });
                     rand.userId=user._id;//to use it back in verify mail
                     rand.save().then().catch();
                     user.appId = randomHash.generate(30);
                     const token = jwt.sign(
                       { _id: user._id,
                         name: user.name, 
                       },
                       process.env.JWTSECRET
                     );
                     user.token = token ;
                     user
                       .save()
                       .then(result => {
                         console.log(result);
                         res.status(201).json({
                           message: 'User created',
                           token: token
                         });
                       })
                       .catch(err => {
                         console.log(err);
                         res.status(500).json({
                           error: err
                         });
                       });
                    }
               });
             }
           });
         }
    });      
};

/**
* UserController login 
*@memberof module:controllers/userControllers
*@function userLogin
*@param {object}  req                Express request object
*@param {string}  req.body.email     you enter user email should be vaild and real
*@param {string}  req.body.password  you put password  min 8 characters and max is 80
*@param {object}  res 
*@param {status}  res.status       if error  it returns status of 400 ,401/ if success it returns status of 200 
*@param {string}  res.message      the type of error /user created successfully
*@param {token}   res.token         it returns token if user login successfully
 */

exports.userLogin = (req, res, next) => {

   User
    .findOne({ email: req.body.email })
    .exec()
    .then(user => {
      if (user.length < 1) {
        return res.status(401).json({
          message: 'Auth failed'
        });
      }
      bcrypt.compare(req.body.password, user.password, (err, result) => {
        if (err) {
          return res.status(401).json({
            message: 'Auth failed'
          });
        }
        if (result) {

          const token = jwt.sign(
            { _id: user._id,
              name: user.name, 
            },
            process.env.JWTSECRET
          );
          User.updateOne({email: req.body.email},{token: token})
          .exec()
          .then(result =>{
              return res.status(200).json({
              message: 'Auth successful',
              token: token
            });
           })
          .catch(err => {
            res.status(401).json({
              message: 'Auth failed'
            });
          });  
        }
      });
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({
        error: err
      });
    });
};
/**
* UserController verify mail
*@memberof module:controllers/userControllers 
*@function userVerifyMail
*@param {object}  req                  Express request object
*@param {string}  req.query.id     random hash key which refrenced to user ID
*@param {object}  res 
*@param {status}  res.status       if error  it returns status of 401 ,500/ if success it returns status of 200 
*@param {string}  res.message      the type of error /Email is verified
 */

exports.userVerifyMail = (req, res, next) => {
  console.log(req.protocol+":/"+req.get('host'));
  if((req.protocol+"://"+req.get('host'))==("http://"+req.get('host'))){
     console.log("Domain is matched. Information is from Authentic email");
     RandHash
     .findOne({ randNo: req.query.id  })
     .exec()
     .then(rand=> {
       if (rand.length < 1) {
         return res.status(401).json({
           message: 'The User doesnot Exist'
         });
       }
         console.log("Email is verified");
          User.updateOne({_id:rand.userId},{active: true})
          .exec()
          .then(result =>{
             res.status(200).json({
             message:"Email is been Successfully verified"
            });
            rand.remove({userID: rand.userId });
           })
          .catch(err => {
            console.log(err);
            res.status(500).json({
              error: err
            });
          });   
    })
    .catch(err => {
       console.log("Email is not verified");
       res.status(500).json({
        error: err
      });
    });
 } else{
      res.status(401).json({
      message: 'Domain doesnot Match'
      });
    }
};
/**
* UserController delete User
*@memberof module:controllers/userControllers
*@function userDelete
*@param {function} checkAuth           Function for validate authenticate
*@param {object}  req                  Express request object
*@param {string}  req.params.id        search by user ID 
*@param {object}  res 
*@param {status}  res.status       if error  it returns status of 500/ if success it returns status of 200 
*@param {string}  res.message      the type of error /User deleted
 */
exports.userDelete = (req, res, next) => {
  User.remove({ _id: req.params.id })
    .exec()
    .then(result => {
      
      res.status(200).json({
        message: 'User deleted'
      });
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({
        error: err
      });
    });
};
/**
* UserController  User logout
*@memberof module:controllers/userControllers
*@function userLogout
*@param {function} checkAuth           Function for validate authenticate
*@param {object}  req                  Express request object
*@param {string}  req.params.id        search by user ID 
*@param {object}  res 
*@param {status}  res.status       if error  it returns status of 500/ if success it returns status of 200 
*@param {string}  res.message      the type of error /User deleted
 */
exports.userLogout = (req, res, next) => {
  const token = req.headers.authorization.split(" ")[1];
  const decoded = jwt.decode(token);
  console.log(decoded._id);
  User.updateOne({_id:decoded._id},{token: null})
  .exec()
  .then(result =>{
     res.status(200).json({
      message: 'logging out success'
    });
  //  rand.remove({userID: rand.userId });
   })
  .catch(err => {
    console.log(err);
    res.status(500).json({
      error: err
    });
  });     
};
/**
* UserController  check mail exists before
*@memberof module:controllers/userControllers
*@function  userMailExist 
*@param {object}  req                  Express request object
*@param {string}  req.params.mail       search by user ID 
*@param {object}  res 
*@param {status}  res.status       if existx  it returns status of 409/ if success it returns status of 200 
*@param {string}  res.message      erorr Mail exists/ or success
 */
exports.userMailExist = function MailExist (req, res, next) {
  User.find({ email: req.params.mail})
    .exec()
    .then(user => {
      if (user.length >= 1) {
        return res.status(409).json({
          message: 'Mail exists'
        });
      } else {
        return res.status(200).json({
          message: 'success'
        });
      }
    })
     .catch(err => {
      console.log(err);
      res.status(500).json({
        error: err
      });
    });
};