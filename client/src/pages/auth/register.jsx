import CommonForm from "@/components/common/form";
import { toast } from "react-toastify";
import { registerFormControls } from "@/config";
import { registerUser } from "@/store/auth-slice";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";

const initialState = {
  userName: "",
  email: "",
  password: "",
  role: "shopper",
};

function AuthRegister() {
  const [formData, setFormData] = useState(initialState);
  const dispatch = useDispatch();
  const navigate = useNavigate();


  function onSubmit(event) {
    event.preventDefault();
    dispatch(registerUser(formData))
      .unwrap()
      .then((payload) => {
        const message = payload?.message ?? "Registration successful";
        if (payload?.success) {
          toast.success(message);
          navigate("/auth/login");
        } else {
          toast.error(message ?? "Registration failed. Please try again.");
        }
      })
      .catch((err) => {
        const message =
          err?.response?.data?.message ??
          err?.message ??
          "Registration failed. Please try again.";
        toast.error(message);
      });
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Create new account
        </h1>
        <p className="mt-4 text-muted-foreground">
          Already have an account?{" "}
          <Link
            className="font-semibold text-primary hover:underline"
            to="/auth/login"
          >
            Login
          </Link>
        </p>
      </div>
      <CommonForm
        formControls={registerFormControls}
        buttonText={"Sign Up"}
        formData={formData}
        setFormData={setFormData}
        onSubmit={onSubmit}
      />
    </div>
  );
}

export default AuthRegister;