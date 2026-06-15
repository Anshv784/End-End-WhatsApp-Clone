import twilio from "twilio";

let client = null;
const getClient = () => {
  if (!client) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) {
      throw new Error("Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) are missing");
    }
    client = twilio(sid, token);
  }
  return client;
};

const serviceSid = process.env.TWILIO_SERVICE_SID;

// Send OTP
export const sendOtpToPhoneNumber = async (phoneNumber) => {
  try {
    if (!phoneNumber) {
      throw new Error("Phone number is required");
    }
    if (!serviceSid) {
      throw new Error("TWILIO_SERVICE_SID is missing");
    }

    const twilioClient = getClient();
    const response = await twilioClient.verify.v2.services(serviceSid).verifications.create({
      to: phoneNumber,
      channel: "sms",
    });

    return response;
  } catch (error) {
    console.error("Twilio sendOtp error:", error);
    throw new Error(error.message || "Failed to send OTP");
  }
};

// Verify OTP
export const verifyOtp = async (phoneNumber, otp) => {
  try {
    if (!serviceSid) {
      throw new Error("TWILIO_SERVICE_SID is missing");
    }

    const twilioClient = getClient();
    const response = await twilioClient.verify.v2.services(serviceSid).verificationChecks.create({
      to: phoneNumber,
      code: otp,
    });

    return response;
  } catch (error) {
    console.error("Twilio verifyOtp error:", error);
    throw new Error(error.message || "Failed to verify OTP");
  }
};
