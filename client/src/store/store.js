import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./auth-slice";
import shopCartSlice from "./shop/cart-slice";
import shopReviewSlice from "./shop/review-slice";
import shopProductsSlice from "./shop/products-slice";
import commonFeatureSlice from "./common-slice";
import shopOrderSlice from "./shop/order-slice";
import shopAddressSlice from "./shop/address-slice";
import adminOrderSlice from "./admin/order-slice";
import adminProductsSlice from './admin/products-slice';
import shopSearchSlice from "./shop/search-slice";
const store = configureStore({
    reducer: {
      auth: authReducer,
      adminProducts: adminProductsSlice,
      shopCart: shopCartSlice,
      shopReview: shopReviewSlice,
      shopProducts: shopProductsSlice,
      commonFeature: commonFeatureSlice,
      shopOrder: shopOrderSlice,
      shopAddress: shopAddressSlice,
      adminOrder: adminOrderSlice,
      shopSearch: shopSearchSlice,
    },
  });
  
  export default store;