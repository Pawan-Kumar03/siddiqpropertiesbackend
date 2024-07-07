// router.jsx
import { createBrowserRouter } from "react-router-dom";
import HomePage from "../../Client/src/pages/HomePage";
import Main from "../../Client/src/layouts/Main";
import PlaceAnAdPage from "../../Client/src/pages/PlaceAnAdPage";
import EditPropertyForm from "../../Client/src/pages/EditPropertyForm";
import PropertyDetails from "../../Client/src/pages/PropertyDetails";

const router = createBrowserRouter([
    {
        path: "/",
        element: <Main />,
        children: [
            {
                path: "/",
                element: <HomePage />,
            },
            {
                path: "/place-an-ad",
                element: <PlaceAnAdPage />,
            },
            {
                path: "/edit-property/:id",
                element: <EditPropertyForm />,
            },
            {
                path: "/property/:id",
                element: <PropertyDetails />,
            },
        ],
    },
]);

export default router;
