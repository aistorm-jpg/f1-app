import { describe, expect, test } from "bun:test";
import {
  countryName,
  formatPoints,
  gridLabel,
  raceDisplayName,
  statusLabel,
  winsLabel,
} from "../src/logic/labels.ts";

describe("danske tekster", () => {
  test("løbsnavne og lande oversættes, ukendte beholdes", () => {
    expect(raceDisplayName("Australian Grand Prix")).toBe("Australiens Grand Prix");
    expect(raceDisplayName("Bahrain Grand Prix in Malaysia")).toBe(
      "Bahrains Grand Prix i Malaysia",
    );
    expect(raceDisplayName("United States Grand Prix")).toBe("USA's Grand Prix");
    expect(raceDisplayName("Mystery Grand Prix")).toBe("Mystery Grand Prix");
    expect(countryName("UK")).toBe("Storbritannien");
    expect(countryName("Wakanda")).toBe("Wakanda");
  });

  test("status, point, sejre og grid", () => {
    expect(statusLabel("Finished")).toBe("I mål");
    expect(statusLabel("Retired")).toBe("Udgået");
    expect(statusLabel("+1 Lap")).toBe("+1 omgang");
    expect(statusLabel("+2 Laps")).toBe("+2 omgange");
    expect(statusLabel("Oil leak")).toBe("Oil leak");
    expect(formatPoints(365)).toBe("365");
    expect(formatPoints(12.5)).toBe("12,5");
    expect(winsLabel(1)).toBe("1 sejr");
    expect(winsLabel(9)).toBe("9 sejre");
    expect(gridLabel(0)).toBe("Pit");
    expect(gridLabel(3)).toBe("3");
  });
});
