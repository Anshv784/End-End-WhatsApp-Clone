import twilio from "twilio";

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const serviceSid = process.env.TWILIO_SERVICE_SID;

// Send OTP
export const sendOtpToPhoneNumber = async (phoneNumber) => {
  try {
    console.log("Sending OTP to:", phoneNumber);

    if (!phoneNumber) {
      throw new Error("Phone number is required");
    }

    const response = await client.verify.v2.services(serviceSid).verifications.create({
      to: phoneNumber,
      channel: "sms",
    });

    console.log("OTP sent response:", response);
    return response;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to send OTP");
  }
};

// Verify OTP
export const verifyOtp = async (phoneNumber, otp) => {
  try {
    console.log("Verifying OTP for:", phoneNumber);

    const response = await client.verify.v2.services(serviceSid).verificationChecks.create({
      to: phoneNumber,
      code: otp,
    });

    console.log("OTP verify response:", response);
    return response;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to verify OTP");
  }
};
