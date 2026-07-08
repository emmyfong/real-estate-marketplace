// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PropertyCard } from "../components/PropertyCard";
import type { Property } from "../lib/types";

const property: Property = {
  id: "prop-1",
  title: "Test listing",
  description: "",
  rent: 2400,
  bedrooms: 2,
  bathrooms: 1,
  propertyType: "condo",
  squareFeet: 850,
  street: "123 Robson St",
  city: "Vancouver",
  province: "BC",
  postalCode: "V6B 1A1",
  lat: 49.28,
  lng: -123.12,
  geohash: "",
  geohashPrefix: "",
  images: ["https://example.com/a.jpg"],
  createdAt: "2026-01-01T00:00:00.000Z"
};

describe("PropertyCard", () => {
  test("renders price, specs, and address", () => {
    render(<PropertyCard property={property} />);
    expect(screen.getByText(/2,400\/mo/)).toBeInTheDocument();
    expect(screen.getByText(/2 bd/)).toBeInTheDocument();
    expect(screen.getByText(/850 sqft/)).toBeInTheDocument();
    expect(screen.getByText("123 Robson St, Vancouver")).toBeInTheDocument();
    expect(screen.getByText("condo")).toBeInTheDocument();
  });

  test("clicking selects the property", () => {
    const onSelect = vi.fn();
    render(<PropertyCard property={property} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("article"));
    expect(onSelect).toHaveBeenCalledWith("prop-1");
  });

  test("hovering emits onHover for both enter and leave", () => {
    const onHover = vi.fn();
    render(<PropertyCard property={property} onHover={onHover} />);
    const article = screen.getByRole("article");
    fireEvent.mouseEnter(article);
    expect(onHover).toHaveBeenCalledWith("prop-1");
    fireEvent.mouseLeave(article);
    expect(onHover).toHaveBeenCalledWith(null);
  });
});
