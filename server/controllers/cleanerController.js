const CleanerProfile = require("../models/CleanerProfile");

const getMyProfile = async (req, res) => {
  try {
    const profile = await CleanerProfile.findOne({
      user: req.user._id
    }).populate(
      "user",
      "firstName lastName email phone city state"
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Cleaner profile has not been created yet."
      });
    }

    res.json({
      success: true,
      profile
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve cleaner profile."
    });
  }
};

const saveMyProfile = async (req, res) => {
  try {
    const {
      businessName,
      bio,
      yearsExperience,
      services,
      startingPrice,
      pricingType,
      serviceCity,
      serviceState,
      serviceRadius,
      availableDays
    } = req.body;

    if (!businessName) {
      return res.status(400).json({
        success: false,
        message: "Business name is required."
      });
    }

    const profileData = {
      businessName,
      bio,
      yearsExperience,
      services,
      startingPrice,
      pricingType,
      serviceCity,
      serviceState,
      serviceRadius,
      availableDays,
      isProfileComplete:
        Boolean(businessName) &&
        Array.isArray(services) &&
        services.length > 0 &&
        Boolean(serviceCity)
    };

    const profile = await CleanerProfile.findOneAndUpdate(
      { user: req.user._id },
      {
        $set: profileData,
        $setOnInsert: {
          user: req.user._id
        }
      },
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    );

    res.json({
      success: true,
      message: "Cleaner profile saved successfully.",
      profile
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Unable to save cleaner profile."
    });
  }
};
const getPublicCleaners = async (req, res) => {
  try {
    const {
      city,
      state,
      service
    } = req.query;

    const filter = {
      isProfileComplete: true
    };

    if (city) {
      filter.serviceCity = {
        $regex: city,
        $options: "i"
      };
    }

    if (state) {
      filter.serviceState = {
        $regex: state,
        $options: "i"
      };
    }

    if (service) {
      filter.services = service;
    }

    const cleaners = await CleanerProfile.find(filter)
      .populate(
        {
          path: "user",
          match: { isActive: true },
          select: "firstName lastName city state"
        }
      )
      .sort({
        rating: -1,
        completedJobs: -1,
        createdAt: -1
      });

    const activeCleaners = cleaners.filter((cleaner) => cleaner.user);

    res.json({
      success: true,
      count: activeCleaners.length,
      cleaners: activeCleaners
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve cleaners."
    });
  }
};

const getPublicCleanerById = async (req, res) => {
  try {
    const cleaner = await CleanerProfile.findOne({
      _id: req.params.id,
      isProfileComplete: true
    }).populate({
      path: "user",
      match: { isActive: true },
      select: "firstName lastName city state"
    });

    if (!cleaner || !cleaner.user) {
      return res.status(404).json({
        success: false,
        message: "Cleaner not found."
      });
    }

    res.json({
      success: true,
      cleaner
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve cleaner."
    });
  }
};
module.exports = {
  getMyProfile,
  saveMyProfile,
  getPublicCleaners,
  getPublicCleanerById
};
