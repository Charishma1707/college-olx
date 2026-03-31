import { Outlet } from "react-router-dom";

function AuthLayout() {
  return (
    <div className="flex min-h-screen w-full">
      <div className="hidden lg:flex relative items-center justify-center w-1/2 px-12 text-primary-foreground overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/40 to-primary/40" />
        <div className="relative max-w-md space-y-6">
          <h1 className="text-4xl font-extrabold tracking-tight">
            Welcome to ShopHub
          </h1>
          <p className="text-primary-foreground/90 text-lg">
            Your one-stop destination for fashion, footwear, and accessories.
          </p>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8 shadow-xl">
        <Outlet />
      </div>
    </div>
  );
}

export default AuthLayout;
