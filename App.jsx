import React from "react";
import { RouterProvider } from "react-router-dom";
import router from "./routes/router";
import { ListingsProvider } from "./contexts/ListingsContext";

export default function App() {
    return (
        <ListingsProvider>
            <RouterProvider router={router} />
        </ListingsProvider>
    );
}
