import CommonForm from "@/components/common/form";
import { toast } from "react-toastify";
import { loginFormControls } from "@/config";
import { loginUser } from "@/store/auth-slice";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";

const initialState = {
  email: "",
  password: "",
};

function AuthLogin() {
  const [formData, setFormData] = useState(initialState);
  const dispatch = useDispatch();
  

  function onSubmit(event) {
    event.preventDefault();

    dispatch(loginUser(formData))
      .unwrap()
      .then((payload) => {
        const message = payload?.message ?? "Logged in successfully";
        if (payload?.success) {
          toast.success(message);
        } else {
          toast.error(message ?? "Login failed. Please try again.");
        }
      })
      .catch((err) => {
        const message =
          err?.response?.data?.message ??
          err?.message ??
          "Login failed. Please try again.";
        toast.error(message);
      });
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Sign in to your account
        </h1>
        <p className="mt-4 text-muted-foreground">
          Don't have an account?{" "}
          <Link
            className="font-semibold text-primary hover:underline"
            to="/auth/register"
          >
            Register
          </Link>
        </p>
      </div>
      <CommonForm
        formControls={loginFormControls}
        buttonText={"Sign In"}
        formData={formData}
        setFormData={setFormData}
        onSubmit={onSubmit}
      />
    </div>
  );
}

export default AuthLogin;