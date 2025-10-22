import { useState, type FormEvent } from "react";
import { useAlert } from "../../contexts/AlertContext";
import { useNavigate } from "react-router";
import { Loader2, ArrowRight } from "lucide-react";

export default function NameForm() {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { showAlert } = useAlert();
    const navigate = useNavigate();
  
    const isFormValid = firstName.trim() && lastName.trim();
  
    const handleSubmit = async (e: FormEvent) => {
      e.preventDefault();
      
      if (!firstName.trim()) {
        showAlert({
          variant: "error",
          title: "First Name Required",
          message: "Please enter your first name to continue."
        });
        return;
      }
  
      if (!lastName.trim()) {
        showAlert({
          variant: "error",
          title: "Last Name Required",
          message: "Please enter your last name to continue."
        });
        return;
      }
  
      setIsLoading(true);
      
      try {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Create user profile
        const profile = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          authenticatedAt: new Date().toISOString(),
          id: Date.now().toString()
        };
        
        // Save profile to localStorage
        localStorage.setItem('profile', JSON.stringify(profile));
        
        showAlert({
          variant: "success",
          title: "Welcome Back!",
          message: `Welcome back, ${profile.firstName}!`
        });
        
        navigate("/dashboard", { replace: true });
      } catch (err) {
        console.error(err);
        showAlert({
          variant: "error",
          title: "Sign In Failed",
          message: "Something went wrong. Please try again."
        });
      } finally {
        setIsLoading(false);
      }
    };
  
    return (
      <div className="w-full px-4">
        <div className="transform transition-all duration-500 ease-out">
            {/* Enhanced header with icons */}
            <div className="mb-8 text-left">
              <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90 mb-2">
                Welcome to Lucent
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Enter your details to access your Green Gravity Lucent toolkit and continue building sustainable solutions
              </p>
            </div>
  
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name fields side by side */}
              <div className="grid grid-cols-2 gap-4">
                {/* First Name input field */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      placeholder="Enter your first name"
                      required
                      disabled={isLoading}
                      className={`w-full px-4 py-3 text-sm rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border-2 border-transparent transition-all duration-200 focus:outline-none focus:border-gray-300 dark:focus:border-gray-400 disabled:opacity-50`}
                    />
                  </div>
                </div>

                {/* Last Name input field */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-2">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative group">
                    <input
                      type="text"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      placeholder="Enter your last name"
                      required
                      disabled={isLoading}
                      className={`w-full px-4 py-3 text-sm rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 border-2 border-transparent transition-all duration-200 focus:outline-none focus:border-gray-300 dark:focus:border-gray-400 disabled:opacity-50`}
                    />
                  </div>
                </div>
              </div>

              {/* Enhanced submit button */}
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={isLoading || !isFormValid}
                  className="group relative px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl disabled:hover:shadow-lg overflow-hidden"
                >
                  <div className="relative flex items-center justify-center">
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        <span>Creating your profile...</span>
                      </>
                    ) : (
                      <>
                        <span>Continue to Dashboard</span>
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" />
                      </>
                    )}
                  </div>
                </button>
              </div>
            </form>
          </div>
        </div>
    );
  }