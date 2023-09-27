const Admin = require("../models/admin");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const config = require("../config");
var fs = require("fs");
var path = require("path");

function generateAccessToken(user) {
    return jwt.sign(
        { data: { id: user._id, email: user.emailAddress } },
        config.jwt_secret_key,
        { expiresIn: config.jwt_ExpiresIn }
    );
}

//User Signs Up - Manually
exports.Signup = async (req, res, next) => {
    const {
        emailAddress,
        password,
    } = req.body;

    Admin.findOne({
        emailAddress: emailAddress,
    })
        .then((user) => {
            ////console.log("user", user);
            if (user) {
                return res
                    .status(400)
                    .json({
                        error: "USER_EXISTS",
                        msg: "Admin Already Exists!",
                        status: false,
                    });
            }

            bcrypt
                .hash(password, 12)
                .then((hashedPassword) => {
                    const newUser = new Admin({
                        emailAddress,
                        password: hashedPassword,
                    });

                    newUser
                        .save()
                        .then(() => {
                            return res
                                .status(200)
                                .json({
                                    msg: "Admin Registered Successfully!",
                                    status: true,
                                });
                        })
                        .catch((err) => {
                            ////console.log(err);
                            return res
                                .status(400)
                                .json({
                                    error: "INTERNAL_SERVER",
                                    msg: "Error in Saving Admin",
                                    status: false,
                                });
                        });
                })
                .catch((err) => {
                    ////console.log(err);
                    return res
                        .status(400)
                        .json({ error: "INTERNAL_SERVER", msg: err, status: false });
                });
        })
        .catch((err) => {
            ////console.log(err);
            return res.status(400).json({ msg: err, status: false });
        });
    ;
};


exports.Signin = async (req, res, next) => {
    const { emailAddress, password } = req.body;

    const re = new RegExp(
        "[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])+"
    );
    let user;
    if (re.test(emailAddress)) {
        user = await Admin.findOne({ emailAddress });
    }

    if (!user) {
        return res
            .status(401)
            .json({ error: "INVALID_USER", msg: "Admin not found!", status: false });
    }

    user.comparePassword(password, async (err, isMatch) => {
        if (err) {
            //console.log(err);
            return res
                .status(400)
                .json({ error: "INTERNAL_SERVER", msg: err, status: false });
        }

        if (!isMatch) {
            return res
                .status(400)
                .send({
                    error: "INVALID_PASSWORD",
                    msg: "Admin Password Do Not Matched!",
                    status: false,
                });
        }

        const token = await generateAccessToken(user);
        const response = {
            token: token,
            user: user,
            status: 200,
        };

        return res.status(200).json(response);
    });
};

exports.Verify = async (req, res, next) => {
    const token = req.header("Authorization");
    let array = token.split(" ");
    const newToken = array[1];

    if (!newToken) return res.status(401).send({ message: "Access Denied", status: 401 });
    try {
        const decoded = jwt.verify(newToken, config.jwt_secret_key);
        let user = await Admin.findOne({ emailAddress: decoded.data.email });
        return res.status(200).json({
            user,
            message: "verified",
            status: 200
        });
    } catch (error) {
        res.send({ message: "Invalid Token", status: 401 });
    }
};