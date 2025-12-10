import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Login from "../components/Login";

// mock image import (fixes the error)
vi.mock("../assets/image.png", () => ({
  default: "test-image.png",
}));

// mock useAuth
const loginMock = vi.fn().mockResolvedValue();

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({
    login: loginMock,
  }),
}));

// mock navigation
const navigateMock = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );
}

describe("Login Page", () => {
  test("renders username, password, and Continue button", () => {
    renderLogin();
    expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
  });

  test("calls login() on form submit", async () => {
    renderLogin();

    fireEvent.change(screen.getByPlaceholderText(/username/i), {
      target: { value: "admin" },
    });
    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: "1234" },
    });

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => expect(loginMock).toHaveBeenCalled());
    expect(loginMock).toHaveBeenCalledWith("admin", "1234");
    expect(navigateMock).toHaveBeenCalledWith("/dashboard");
  });
});
