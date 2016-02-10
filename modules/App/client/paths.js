export default {
    // The paths the user can see while logged in.
    loggedIn: [
        { title: "Dashboard", path: "/dashboard" }
    ],
    // The paths the user can see while not logged in.
    loggedOut: [
        { title: "Home", path: "/" },
        { title: "Login", path: "/login" },
        { title: "Register", path: "/register" }
    ],
    notValid: [
        { title: "Register", path: "/register" }
    ]
};