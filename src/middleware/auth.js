const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.authenticate = async (req, res, next) => {
    try{
        //** !Authorization headers -> Token is Missing */
        const header =  req.headers.authorization;
        if(!header || !header.startsWith("Bearer ")){
            return res.status(401).json({
                message: "Token is Missing"
            });
        }

        //** Token Verify */
        const token = header.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        //** DB user -> Collect */
        const user = await User.findById(decoded.id).lean();
        if(!user){
            return res.status(401).json({
                message: "User no longer exists"
            });
        }

        req.user = {
            id: user._id.toString(), 
            role: user.role
        };

        next();
    } catch(error) {
        //** Error Response */
        return res.status(401).json({
            message: "Invalid or expired token"
        })
    }
};


exports.authorize = (...roles) => {
    return (req, res, next) => {
        if(!roles.includes(req.user.role)){
            return res.status(403).json({
                message: "Forbidden"
            });
        }
        next();
    };
};
