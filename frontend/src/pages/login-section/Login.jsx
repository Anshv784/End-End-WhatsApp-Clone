import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import Progressbar from "../../components/Progressbar";
import { FaWhatsapp, FaChevronDown, FaUser } from "react-icons/fa";
import Spinner from "../../components/Spinner";

import useLoginStore from "../../store/loginStore";
import countries from "../../utils/countries";
import { avatars } from "../../utils/avatars";
import { useNavigate } from "react-router-dom";
import useUserStore from "../../store/userStore";
import useThemeStore from "../../store/themeStore";

import { motion } from "framer-motion";
import {
  loginValidationSchema,
  otpValidationSchema,
  profileValidationSchema,
} from "../../validations/loginSchema";

const Login = () => {
  const { step, setStep, setUserPhoneData, userPhoneData, resetLoginState } =
    useLoginStore();
  const { setUser } = useUserStore();
  const { theme, setTheme } = useThemeStore();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [email, setEmail] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(avatars[0]);
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const [error, setError] = useState("");
  const [loading ,setLoading] = useState(false);

  const navigate = useNavigate();

  const filterCountries = countries.filter(
    (country) =>
      country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.dialCode.includes(searchTerm)
  );

  // Forms
  const {
    register: loginRegister,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm({
    resolver: yupResolver(loginValidationSchema),
  });

  const {
    handleSubmit: handleOtpSubmit,
    formState: { errors: otpErrors },
    setValue: setOtpValue,
  } = useForm({
    resolver: yupResolver(otpValidationSchema),
  });

  const {
    register: profileRegister,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    watch,
  } = useForm({
    resolver: yupResolver(profileValidationSchema),
  });

  return (
    <div
      className={`min-h-screen ${
        theme === "dark"
          ? "bg-gray-900"
          : "bg-gradient-to-br from-green-400 to-blue-500"
      } flex items-center justify-center overflow-hidden p-4`}
    >
      <motion.div
        initial={{
          opacity: 0,
          y: -50,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.5,
        }}
        className={`${
          theme === "dark" ? "bg-gray-800 text-white" : "bg-white"
        } p-6 md:p-8 rounded-lg shadow-2xl w-full max-w-md relative z-10`}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            duration: 0.2,
            type: "spring",
            stiffness: 260,
            damping: 20,
          }}
          className="w-24 h-24 bg-green-500 rounded-full mx-auto mb-6 flex items-center justify-center"
        >
          <FaWhatsapp className="w-16 h-16 text-white" />
        </motion.div>

        <h1
          className={`text-3xl font-bold text-center mb-6 ${
            theme === "dark" ? "text-white" : "text-gray-800"
          }`}
        >
          Whatsapp Login
        </h1>
        <Progressbar theme={theme} step={step} />

        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        {step === 1 && (
          <form className="space-y-4" onSubmit={handleLoginSubmit((data)=> console.log(data))}>
            <p
              className={`text-center ${
                theme === "dark" ? "text-gray-300" : "text-gray-600"
              } mb-4`}
            >
              Enter your phone number to receive an OTP
            </p>

            <div className="relative">
              <div className="flex">
                <div className="relative w-1/3">
                  <button
                    type="button"
                    onClick={() => setShowDropdown(!showDropdown)}
                    className={`flex-shrink-0 z-10 inline-flex items-center py-2.5 px-4 text-sm font-medium text-center ${
                      theme === "dark"
                        ? "text-white bg-gray-700 border-gray-600"
                        : "text-gray-900 bg-gray-100 border-gray-300"
                    } border rounded-s-lg hover:bg-gray-200 focus:right-4 focus:outline-none focus:ring-gray-100`}
                  >
                    <span>
                      {selectedCountry.flag} {selectedCountry.dialCode}
                    </span>
                    <FaChevronDown className="ml-2" />
                  </button>

                  {showDropdown && (
                    <div
                      className={`absolute z-10 w-full mt-1 ${
                        theme === "dark"
                          ? "bg-gray-700 border-gray-600"
                          : "bg-white border-gray-300"
                      } border rounded-md shadow-lg max-h-60 overflow-auto`}
                    >
                      <div
                        className={`sticky top-0 ${
                          theme === "dark" ? "bg-gray-700" : "bg-white"
                        } p-2`}
                      >
                        <input
                          type="text"
                          placeholder="Search countries..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className={`w-full px-2 py-1 border ${
                            theme === "dark"
                              ? "bg-gray-600 border-gray-500 text-white"
                              : "bg-white border-gray-300"
                          } rounded-md text-sm focus:outline-none focus:right-2 focus:ring-green-500`}
                        />
                      </div>

                      {filterCountries.map((country) => (
                        <button
                          key={country.alpha2}
                          type="button"
                          className={`w-full text-left px-3 py-2 ${
                            theme === "dark"
                              ? "hover:bg-gray-600"
                              : "hover:bg-gray-100"
                          }`}
                          onClick={() => {
                            setSelectedCountry(country);
                            setShowDropdown(false);
                          }}
                        >
                          {country.flag} {country.dialCode} {country.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  {...loginRegister("phoneNumber")}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="PhoneNumber"
                  className={`w-2/3 px-4 py-2 border ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-500"
                  }
                rounded-md focus:outline-none focus:right-2 focus:ring-green-500 ${
                  loginErrors.phoneNumber ? "border-red-500" : ""
                }`}
                />
              </div>
              {loginErrors.phoneNumber && (
                <p className="text-red-500 text-sm">
                  {loginErrors.phoneNumber.message}
                </p>
              )}
            </div>

            {/* divider */}

            <div className="flex items-center my-4">
              <div className="flex-grow h-px bg-gray-300"></div>
              <span className="mx-3 text-gray-500 text-small font-medium">
                or
              </span>
              <div className="flex-grow h-px bg-gray-300"></div>
            </div>

            {/* email */}
            <div
              className={`flex items-center px-3 py-2 border rounded-md  ${
                theme === "dark"
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-500"
              }`}
            >
              <FaUser
                className={`mr-2 text-gray-400 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
              />
              <input
                type="text"
                {...loginRegister("email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (optional)"
                className={`w-full bg-transparent focus:outline-none ${
                  theme === "dark" ? "text-white" : "text-black"
                } ${loginErrors.email ? "border-red-500" : ""}`}
              />
            </div>
            {loginErrors.email && (
              <p className="text-red-500 text-sm">
                {loginErrors.email.message}
              </p>
            )}

            <button
              type="submit"
              className={`bg-green-500 text-white rounded-md w-full py-2 hover:bg-green-500 transition border`}
            >{loading? <Spinner/> : "Send OTP"} </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default Login;
