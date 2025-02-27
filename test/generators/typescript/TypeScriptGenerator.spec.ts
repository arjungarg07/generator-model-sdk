import { TypeScriptGenerator } from '../../../src/generators'; 

describe('TypeScriptGenerator', function() {
  let generator: TypeScriptGenerator;
  beforeEach(() => {
    generator = new TypeScriptGenerator();
  });
  test('should render union property type', async function() {
    const doc = {
      $id: "_address",
      type: "object",
      properties: {
        state:          { type: "string", enum: ["Texas", "Alabama", "California", "other"] }
      }
    };
    const expected = `export class Address {
  private _state?: "Texas" | "Alabama" | "California" | "other";

  constructor(input: {
    state?: "Texas" | "Alabama" | "California" | "other",
  }) {
    this._state = input.state;
  }

  get state(): "Texas" | "Alabama" | "California" | "other" | undefined { return this._state; }
  set state(state: "Texas" | "Alabama" | "California" | "other" | undefined) { this._state = state; }
}`;

    const inputModel = await generator.process(doc);
    const model = inputModel.models["_address"];

    let classModel = await generator.renderClass(model, inputModel);
    expect(classModel).toEqual(expected);

    classModel = await generator.render(model, inputModel);
    expect(classModel).toEqual(expected);
  });
  test('should render `class` type', async function() {
    const doc = {
      $id: "_address",
      type: "object",
      properties: {
        street_name:    { type: "string" },
        city:           { type: "string", description: "City description" },
        state:          { type: "string" },
        house_number:   { type: "number" },
        marriage:       { type: "boolean", description: "Status if marriage live in given house" },
        members:        { oneOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }], },
        array_type:     { type: "array", items: [{ type: "string" }, { type: "number" }] },
      },
      required: ["street_name", "city", "state", "house_number", "array_type"],
    };
    const expected = `export class Address {
  private _streetName: string;
  private _city: string;
  private _state: string;
  private _houseNumber: number;
  private _marriage?: boolean;
  private _members?: string | number | boolean;
  private _arrayType: Array<string | number>;

  constructor(input: {
    streetName: string,
    city: string,
    state: string,
    houseNumber: number,
    marriage?: boolean,
    members?: string | number | boolean,
    arrayType: Array<string | number>,
  }) {
    this._streetName = input.streetName;
    this._city = input.city;
    this._state = input.state;
    this._houseNumber = input.houseNumber;
    this._marriage = input.marriage;
    this._members = input.members;
    this._arrayType = input.arrayType;
  }

  get streetName(): string { return this._streetName; }
  set streetName(streetName: string) { this._streetName = streetName; }

  get city(): string { return this._city; }
  set city(city: string) { this._city = city; }

  get state(): string { return this._state; }
  set state(state: string) { this._state = state; }

  get houseNumber(): number { return this._houseNumber; }
  set houseNumber(houseNumber: number) { this._houseNumber = houseNumber; }

  get marriage(): boolean | undefined { return this._marriage; }
  set marriage(marriage: boolean | undefined) { this._marriage = marriage; }

  get members(): string | number | boolean | undefined { return this._members; }
  set members(members: string | number | boolean | undefined) { this._members = members; }

  get arrayType(): Array<string | number> { return this._arrayType; }
  set arrayType(arrayType: Array<string | number>) { this._arrayType = arrayType; }
}`;

    const inputModel = await generator.process(doc);
    const model = inputModel.models["_address"];

    let classModel = await generator.renderClass(model, inputModel);
    expect(classModel).toEqual(expected);

    classModel = await generator.render(model, inputModel);
    expect(classModel).toEqual(expected);
  });

  test('should work custom preset for `class` type', async function() {
    const doc = {
      $id: "CustomClass",
      type: "object",
      properties: {
        property: { type: "string" },
      }
    };
    const expected = `export class CustomClass {
  @JsonProperty("property")
  private _property?: string;

  constructor(input: {
    property?: string,
  }) {
    this._property = input.property;
  }

  get property(): string | undefined { return this._property; }
  set property(property: string | undefined) { this._property = property; }
}`;

    generator = new TypeScriptGenerator({ presets: [
      {
        class: {
          property({ propertyName, content }) {
            return `@JsonProperty("${propertyName}")
${content}`;
          },
        }
      }
    ] });

    const inputModel = await generator.process(doc);
    const model = inputModel.models["CustomClass"];
    
    const classModel = await generator.render(model, inputModel);
    expect(classModel).toEqual(expected);
  });

  test('should render `interface` type', async function() {
    const doc = {
      $id: "Address",
      type: "object",
      properties: {
        street_name:    { type: "string" },
        city:           { type: "string", description: "City description" },
        state:          { type: "string" },
        house_number:   { type: "number" },
        marriage:       { type: "boolean", description: "Status if marriage live in given house" },
        members:        { oneOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }], },
        array_type:     { type: "array", items: [{ type: "string" }, { type: "number" }] },
      },
      required: ["street_name", "city", "state", "house_number", "array_type"],
    };
    const expected = `export interface Address {
  streetName: string;
  city: string;
  state: string;
  houseNumber: number;
  marriage?: boolean;
  members?: string | number | boolean;
  arrayType: Array<string | number>;
}`;

    const interfaceGenerator = new TypeScriptGenerator({modelType: "interface"});
    const inputModel = await interfaceGenerator.process(doc);
    const model = inputModel.models["Address"];

    let interfaceModel = await interfaceGenerator.render(model, inputModel);
    expect(interfaceModel).toEqual(expected);
  });

  test('should work custom preset for `interface` type', async function() {
    const doc = {
      $id: "CustomInterface",
      type: "object",
      properties: {
        property: { type: "string" },
      }
    };
    const expected = `export interface CustomInterface {
  property?: string;
}`;

    generator = new TypeScriptGenerator({ presets: [
      {
        interface: {
          self({ content }) {
            return `${content}`;
          },
        }
      }
    ] });

    const inputModel = await generator.process(doc);
    const model = inputModel.models["CustomInterface"];

    const interfaceModel = await generator.renderInterface(model, inputModel);
    expect(interfaceModel).toEqual(expected);
  });

  test('should render `enum` type', async function() {
    const doc = {
      $id: "States",
      type: "string",
      enum: ["Texas", "Alabama", "California"],
    };
    const expected = `export enum States {
  TEXAS = "Texas",
  ALABAMA = "Alabama",
  CALIFORNIA = "California",
}`;

    const inputModel = await generator.process(doc);
    const model = inputModel.models["States"];

    let enumModel = await generator.render(model, inputModel);
    expect(enumModel).toEqual(expected);
    
    enumModel = await generator.renderEnum(model, inputModel);
    expect(enumModel).toEqual(expected);
  });

  test('should work custom preset for `enum` type', async function() {
    const doc = {
      $id: "CustomEnum",
      type: "string",
      enum: ["Texas", "Alabama", "California"],
    };
    const expected = `export enum CustomEnum {
  TEXAS = "Texas",
  ALABAMA = "Alabama",
  CALIFORNIA = "California",
}`;

    generator = new TypeScriptGenerator({ presets: [
      {
        enum: {
          self({ content }) {
            return `${content}`;
          },
        }
      }
    ] });

    const inputModel = await generator.process(doc);
    const model = inputModel.models["CustomEnum"];
    
    let enumModel = await generator.render(model, inputModel);
    expect(enumModel).toEqual(expected);
    
    enumModel = await generator.renderEnum(model, inputModel);
    expect(enumModel).toEqual(expected);
  });

  test('should render `type` type - primitive', async function() {
    const doc = {
      $id: "TypePrimitive",
      type: "string",
    };
    const expected = `export type TypePrimitive = string;`

    const inputModel = await generator.process(doc);
    const model = inputModel.models["TypePrimitive"];

    let primitiveModel = await generator.renderType(model, inputModel);
    expect(primitiveModel).toEqual(expected);

    primitiveModel = await generator.render(model, inputModel);
    expect(primitiveModel).toEqual(expected);
  });

  test('should render `type` type - enum', async function() {
    const doc = {
      $id: "TypeEnum",
      enum: ["Texas", "Alabama", "California", 0, 1, false, true],
    };
    const expected = `export type TypeEnum = "Texas" | "Alabama" | "California" | 0 | 1 | false | true;`

    const inputModel = await generator.process(doc);
    const model = inputModel.models["TypeEnum"];

    const enumModel = await generator.renderType(model, inputModel);
    expect(enumModel).toEqual(expected);
  });

  test('should render `type` type - union', async function() {
    const doc = {
      $id: "TypeUnion",
      type: ["string", "number", "boolean"],
    };
    const expected = `export type TypeUnion = string | number | boolean;`

    const inputModel = await generator.process(doc);
    const model = inputModel.models["TypeUnion"];

    const unionModel = await generator.renderType(model, inputModel);
    expect(unionModel).toEqual(expected);
  });

  test('should render `type` type - array of primitive type', async function() {
    const doc = {
      $id: "TypeArray",
      type: "array",
      items: {
        $id: "StringArray",
        type: "string",
      }
    };
    const expected = `export type TypeArray = Array<string>;`

    const inputModel = await generator.process(doc);
    const model = inputModel.models["TypeArray"];

    const arrayModel = await generator.renderType(model, inputModel);
    expect(arrayModel).toEqual(expected);
  });

  test('should render `type` type - array of union type', async function() {
    const doc = {
      $id: "TypeArray",
      type: "array",
      items: {
        $id: "StringArray",
        type: ["string", "number", "boolean"],
      }
    };
    const expected = `export type TypeArray = Array<string | number | boolean>;`

    const inputModel = await generator.process(doc);
    const model = inputModel.models["TypeArray"];

    const arrayModel = await generator.renderType(model, inputModel);
    expect(arrayModel).toEqual(expected);
  });

});
