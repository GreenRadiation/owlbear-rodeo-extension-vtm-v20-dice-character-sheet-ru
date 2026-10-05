import { describe, expect, it } from "vitest";

import { decodeSheet, encodeSheet } from "./codec";
import { CLANS, DISCIPLINES, MERITS } from "./lists";
import {
  Sheet,
  clickBloodDots,
  clickDots,
  createSheet,
  getAttributeDice,
  getBlood,
  sanitizeSheet,
  setLocked,
} from "./model";
import { exportVtmcl, importVtmcl } from "./vtmcl";

/** A sheet with everything filled in, about as big as a real one gets */
function fullSheet(): Sheet {
  const sheet = createSheet();
  sheet.name = "Дерек Грин";
  sheet.nature = "Бонвиван";
  sheet.age = "42";
  sheet.clan = "Тореадор";
  sheet.generation = 9;
  sheet.attributes.dexterity = 4;
  sheet.attributes.intelligence = 4;
  sheet.abilities.empathy = 4;
  sheet.abilities.finance = 2;
  sheet.abilities.expression = 3;
  sheet.specialties.intelligence = "Начитанность";
  sheet.specialties.expression = "Уличная живопись";
  sheet.disciplines = [
    { name: "Ясновидение", value: 2 },
    { name: "Стремительность", value: 1 },
    { name: "Присутствие", value: 3 },
  ];
  sheet.backgrounds = [
    { name: "Богатство", value: 4 },
    { name: "Слава", value: 2 },
    { name: "Собственная выдумка", value: 1 },
  ];
  sheet.virtues = { conscience: 4, self_control: 3, courage: 3 };
  sheet.humanity = 8;
  sheet.willpower = 6;
  sheet.willpowerPool = 4;
  sheet.bloodPool = 11;
  sheet.health = [1, 2, 3, 0, 0, 0, 0];
  sheet.merits = [MERITS[0], "Своё достоинство"];
  sheet.flaws = ["Панические атаки при пробуждении"];
  sheet.experience = "12 / 30";
  sheet.locked = true;
  sheet.bloodDots.dexterity = 1;
  return sheet;
}

describe("dots", () => {
  it("fills up to an empty dot", () => {
    expect(clickDots(2, 3)).toBe(4);
    expect(clickDots(0, 0)).toBe(1);
  });

  it("clears from a filled dot on", () => {
    expect(clickDots(4, 1)).toBe(1);
    expect(clickDots(4, 3)).toBe(3);
    expect(clickDots(1, 0)).toBe(0);
  });

  it("adds blood dots after the permanent ones", () => {
    // 3 permanent dots, a click on the fifth dot adds two blood dots
    expect(clickBloodDots(3, 0, 4)).toBe(2);
    // A click on a blood dot clears from it on
    expect(clickBloodDots(3, 2, 3)).toBe(0);
    expect(clickBloodDots(3, 2, 4)).toBe(1);
  });

  it("doesn't change the permanent dots of a locked sheet", () => {
    expect(clickBloodDots(3, 1, 0)).toBe(1);
    expect(clickBloodDots(3, 1, 2)).toBe(1);
  });

  it("counts blood dots in the dice of an attribute", () => {
    const sheet = fullSheet();
    expect(getAttributeDice(sheet, "dexterity")).toBe(5);
    expect(getAttributeDice(sheet, "intelligence")).toBe(4);
  });

  it("removes blood dots when the sheet is unlocked", () => {
    const unlocked = setLocked(fullSheet(), false);
    expect(unlocked.locked).toBe(false);
    expect(unlocked.bloodDots.dexterity).toBe(0);
    expect(setLocked(fullSheet(), true).bloodDots.dexterity).toBe(1);
  });
});

describe("sanitizing", () => {
  it("makes an empty sheet out of nothing", () => {
    expect(sanitizeSheet(undefined)).toEqual(createSheet());
    expect(sanitizeSheet("nonsense")).toEqual(createSheet());
  });

  it("keeps a valid sheet as it is", () => {
    expect(sanitizeSheet(fullSheet())).toEqual(fullSheet());
  });

  it("clamps what is out of range", () => {
    const sheet = sanitizeSheet({
      generation: 99,
      attributes: { strength: 12, dexterity: -3 },
      humanity: 50,
      bloodPool: 500,
      health: [7, 1],
      bloodDots: { strength: 3 },
    });
    expect(sheet.generation).toBe(15);
    expect(sheet.attributes.strength).toBe(5);
    expect(sheet.attributes.dexterity).toBe(0);
    expect(sheet.humanity).toBe(10);
    expect(sheet.bloodPool).toBe(getBlood(15).pool);
    expect(sheet.health).toEqual([3, 1, 0, 0, 0, 0, 0]);
    // No empty dots are left for blood next to 5 permanent ones
    expect(sheet.bloodDots.strength).toBe(0);
  });

  it("knows the blood pool of a generation", () => {
    expect(getBlood(13)).toEqual({ pool: 10, perTurn: 1 });
    expect(getBlood(8)).toEqual({ pool: 15, perTurn: 3 });
    expect(getBlood(4)).toEqual({ pool: 50, perTurn: 10 });
  });
});

describe("codec", () => {
  it("reads back what it wrote", () => {
    expect(decodeSheet(encodeSheet(fullSheet()))).toEqual(fullSheet());
    expect(decodeSheet(encodeSheet(createSheet()))).toEqual(createSheet());
  });

  it("stores names from the lists as numbers", () => {
    const encoded = encodeSheet(fullSheet());
    expect(encoded).not.toContain("Тореадор");
    expect(encoded).not.toContain("Ясновидение");
    expect(encoded).toContain("Собственная выдумка");
    expect(CLANS).toContain("Тореадор");
    expect(DISCIPLINES).toContain("Ясновидение");
  });

  it("keeps a sheet small", () => {
    const bytes = (value: string) => new TextEncoder().encode(value).length;
    expect(bytes(encodeSheet(createSheet()))).toBeLessThan(150);
    // Six sheets like this one and the roll histories have to fit in 16000 bytes
    expect(bytes(encodeSheet(fullSheet()))).toBeLessThan(600);
  });

  it("returns nothing for what it can't read", () => {
    expect(decodeSheet(undefined)).toBeNull();
    expect(decodeSheet("")).toBeNull();
    expect(decodeSheet("not json")).toBeNull();
    expect(decodeSheet("[99]")).toBeNull();
    expect(decodeSheet('{"name":"x"}')).toBeNull();
  });

  it("survives a damaged sheet", () => {
    expect(decodeSheet("[1]")).toEqual(createSheet());
    expect(decodeSheet('[1,"Имя",999,null,"Свой клан"]')).toEqual({
      ...createSheet(),
      name: "Имя",
      clan: "Свой клан",
    });
  });
});

describe("trechkalov.com format", () => {
  it("writes a file it can read back", () => {
    const sheet = fullSheet();
    const imported = importVtmcl(exportVtmcl(sheet, "Заметки", 2));
    expect(imported).not.toBeNull();
    // The site has no specialities, lock or blood dots
    expect(imported!.sheet).toEqual({
      ...sheet,
      specialties: {},
      locked: false,
      bloodDots: createSheet().bloodDots,
    });
    expect(imported!.notes).toBe("Заметки");
  });

  it("writes every field the site expects", () => {
    const file = JSON.parse(exportVtmcl(fullSheet(), "", 2));
    expect(Object.keys(file).sort()).toEqual(["Charsheet", "Settings", "Version"]);
    expect(file.Version).toBe("0.7.0");
    expect(file.Charsheet.preset).toBe("vampire_v20");
    expect(file.Charsheet.profile.generation).toBe("9-е");
    expect(file.Charsheet.state.bloodPerTurn).toBe("2");
    expect(Object.keys(file.Charsheet.abilities)).toHaveLength(50);
    expect(file.Charsheet.health).toEqual({
      bruised: 1,
      hurt: 2,
      injured: 3,
      wounded: 0,
      mauled: 0,
      crippled: 0,
      incapacitated: 0,
    });
  });

  it("reads the generation in both languages of the site", () => {
    const read = (generation: string) =>
      importVtmcl(
        JSON.stringify({
          Charsheet: { attributes: {}, abilities: {}, profile: { generation } },
        })
      )!.sheet.generation;
    expect(read("8-е")).toBe(8);
    expect(read("10th")).toBe(10);
    expect(read("")).toBe(13);
  });

  it("refuses what isn't a sheet", () => {
    expect(importVtmcl("not json")).toBeNull();
    expect(importVtmcl('{"cells":{}}')).toBeNull();
    expect(importVtmcl("[]")).toBeNull();
  });
});
