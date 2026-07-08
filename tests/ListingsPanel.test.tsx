// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ListingsPanel } from "../components/ListingsPanel";
import type { Property } from "../lib/types";

function makeProperty(id: string, overrides: Partial<Property> = {}): Property {
  return {
    id,
    title: `Listing ${id}`,
    description: "",
    rent: 2000,
    bedrooms: 2,
    bathrooms: 1,
    propertyType: "apartment",
    squareFeet: 800,
    street: `${id} Test St`,
    city: "Vancouver",
    province: "BC",
    postalCode: "V6B 1A1",
    lat: 49.28,
    lng: -123.12,
    geohash: "",
    geohashPrefix: "",
    images: ["https://example.com/a.jpg"],
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

const baseProps = {
  properties: [] as Property[],
  loading: false,
  refreshing: false,
  error: null as string | null,
  sort: "priceAsc" as const,
  onSort: () => {},
  activeId: null,
  hoveredId: null,
  onSelect: () => {},
  onHover: () => {}
};

describe("ListingsPanel states", () => {
  test("loading shows skeletons and 'Searching…'", () => {
    render(<ListingsPanel {...baseProps} loading />);
    expect(screen.getByText("Searching…")).toBeInTheDocument();
    expect(screen.getByTestId("skeleton-grid")).toBeInTheDocument();
  });

  test("empty shows an empty-state message", () => {
    render(<ListingsPanel {...baseProps} properties={[]} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("No listings here")).toBeInTheDocument();
  });

  test("error shows an alert with a working retry", () => {
    const onRetry = vi.fn();
    render(<ListingsPanel {...baseProps} error="Internal server error" onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Internal server error")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  test("results render one card per property", () => {
    const props = [makeProperty("a"), makeProperty("b"), makeProperty("c")];
    render(<ListingsPanel {...baseProps} properties={props} />);
    expect(screen.getByText("3 homes in view")).toBeInTheDocument();
    expect(screen.getAllByText(/Test St/)).toHaveLength(3);
  });

  test("changing the sort control calls onSort", () => {
    const onSort = vi.fn();
    render(<ListingsPanel {...baseProps} properties={[makeProperty("a")]} onSort={onSort} />);
    fireEvent.change(screen.getByLabelText("Sort listings"), { target: { value: "priceDesc" } });
    expect(onSort).toHaveBeenCalledWith("priceDesc");
  });
});
