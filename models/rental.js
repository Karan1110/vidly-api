const Joi = require("joi");
const mongoose = require("mongoose");
const moment = require("moment");
const { userSchema } = require("./user.js");
const { User } = require("./user.js");

const rentalSchema = new mongoose.Schema(
  {
    user: {
      type: userSchema,
      required: true,
    },
    movie: {
      type: new mongoose.Schema({
        title: {
          type: String,
          required: true,
          trim: true,
          minlength: 5,
          maxlength: 255,
        },
        description: {
          type: String,
          required: true,
        },
      }),
      required: true,
    },
    dateReturned: {
      type: Boolean,
    },
    rentalFee: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

rentalSchema.statics.lookup = function (userId, movieId) {
  return this.findOne({
    "user._id": userId,
    "movie._id": movieId,
  });
};

rentalSchema.methods.return = async function () {
  this.dateReturned = new Date();
  const rentalDays = moment().diff(this.createdAt, "days");

  if (rentalDays > 30) {
    return;
  }

  await User.updateOne(
    {
      _id: this.user._id,
    },
    {
      points: {
        $inc: -2,
      },
    }
  );
};

const Rental = mongoose.model("Rental", rentalSchema);

function validateRental(rental) {
  const schema = {
    userId: Joi.objectId().required(),
    movieId: Joi.objectId().required(),
  };

  return Joi.validate(rental, schema);
}

exports.Rental = Rental;
exports.validate = validateRental;
