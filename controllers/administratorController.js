const mongoose = require('mongoose');
const Request = require('../models/Request');
const User = require('../models/User')

async function createRequest (name){
    console.log("CReating new recuest")
    const notification = new Request ({
        name:name
  });
  notification.save()
};
exports.CreateNewRequest = createRequest

exports.getAllRequests = async function(req, res) {
    let match = await Request.find({},{name:1,_id:0})
    return res.send(match);

};

exports.getAllUsers = async function(req, res) {
    //we need to add Firstname, LastName,City,Address
    let users = await User.find({},{_id:0,name:1,gender:1,birthDate:1,role:1,email:1,status:1})
    return res.send(users);

};

exports.removeUser = async function(req, res) {
    let username = req.params.username;
    console.log(username)
    await User
    .deleteOne({name:username})
    return res.status(200).json({
        message: 'Delete User Successful'
      });
  

};
exports.approveRequest = async function(req, res) {
    let username = req.params.username;
    await User
    .updateOne({name:username},{'status':"Approved"} );

    await Request
    .deleteOne({name:username});

    return res.status(200).json({
      message: 'Approval Successful'
    });


};