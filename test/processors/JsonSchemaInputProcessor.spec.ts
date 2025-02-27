import * as fs from 'fs';
import * as path from 'path';
import { JsonSchemaInputProcessor } from '../../src/processors/JsonSchemaInputProcessor';
import { CommonInputModel, CommonModel, Schema } from '../../src/models';
import { simplify } from '../../src/simplification/Simplifier';
jest.mock('../../src/simplification/Simplifier');
jest.spyOn(JsonSchemaInputProcessor, 'convertSchemaToCommonModel');
describe('JsonSchemaInputProcessor', function () {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });
  describe('process()', function () {
    const getCommonInput = async (inputSchemaPath: string) => {
      const inputSchemaString = fs.readFileSync(path.resolve(__dirname, inputSchemaPath), 'utf8');
      const inputSchema = JSON.parse(inputSchemaString);
      const processor = new JsonSchemaInputProcessor();
      const commonInputModel = await processor.process(inputSchema);
      return {inputSchema, commonInputModel};
    }
    beforeAll(() => {
      const model = new CommonModel();
      model.$id = "test";
      (simplify as jest.Mock).mockImplementation(() => [model]);
    });
    test('should throw error when trying to process wrong schema', async function () {
      const processor = new JsonSchemaInputProcessor();
      await expect(processor.process({$schema: 'http://json-schema.org/draft-99/schema#'}))
        .rejects
        .toThrow('Input is not a JSON Schema, so it cannot be processed.');
    });
    test('should process normal schema', async function () {
      const inputSchemaPath = './JsonSchemaInputProcessor/basic.json';
      const {commonInputModel, inputSchema} = await getCommonInput(inputSchemaPath);
      expect(commonInputModel).toMatchObject({models: {"test" : {$id: "test"}}, originalInput: inputSchema});
      expect(simplify).toHaveBeenCalledTimes(1);
      const functionArgSimplify = (simplify as jest.Mock).mock.calls[0][0];
      expect(functionArgSimplify).toMatchObject(inputSchema);
      expect(JsonSchemaInputProcessor.convertSchemaToCommonModel).toHaveBeenCalledTimes(1);
      const functionArgConvertSchemaToCommonModel = (JsonSchemaInputProcessor.convertSchemaToCommonModel as jest.Mock).mock.calls[0][0];
      expect(functionArgConvertSchemaToCommonModel).toMatchObject(inputSchema);
    });
    test('should be able to use $ref', async function () {
      const inputSchemaPath = './JsonSchemaInputProcessor/references.json';
      const {commonInputModel, inputSchema} = await getCommonInput(inputSchemaPath);
      const expectedResolvedInput = {...inputSchema, properties: { "street_address": { "type": "string" }}};
      expect(commonInputModel).toMatchObject({models: {"test" : {$id: "test"}}, originalInput: inputSchema});
      expect(simplify).toHaveBeenCalledTimes(1);
      const functionArgSimplify = (simplify as jest.Mock).mock.calls[0][0];
      expect(functionArgSimplify).toMatchObject(expectedResolvedInput);
      expect(JsonSchemaInputProcessor.convertSchemaToCommonModel).toHaveBeenCalledTimes(1);
      const functionArgConvertSchemaToCommonModel = (JsonSchemaInputProcessor.convertSchemaToCommonModel as jest.Mock).mock.calls[0][0];
      expect(functionArgConvertSchemaToCommonModel).toMatchObject(expectedResolvedInput);
    });
    test('should be able to use $ref when circular', async function () {
      const inputSchemaPath = './JsonSchemaInputProcessor/references_circular.json';
      const {commonInputModel, inputSchema} = await getCommonInput(inputSchemaPath);
      const expectedResolvedInput = {...inputSchema, definitions: {}, properties: { "street_address": { type: "object", properties: { "floor": { type: "object", properties: {} } }}}};
      expect(commonInputModel).toMatchObject({models: {"test" : {$id: "test"}}, originalInput: inputSchema});
      expect(simplify).toHaveBeenCalledTimes(1);
      const functionArgSimplify = (simplify as jest.Mock).mock.calls[0][0];
      expect(functionArgSimplify).toMatchObject(expectedResolvedInput);
      expect(JsonSchemaInputProcessor.convertSchemaToCommonModel).toHaveBeenCalledTimes(1);
      const functionArgConvertSchemaToCommonModel = (JsonSchemaInputProcessor.convertSchemaToCommonModel as jest.Mock).mock.calls[0][0];
      expect(functionArgConvertSchemaToCommonModel).toMatchObject(expectedResolvedInput);
    });
    test('should fail correctly when reference cannot be resolved', async function () {
      const inputSchemaPath = './JsonSchemaInputProcessor/wrong_references.json';
      const inputSchemaString = fs.readFileSync(path.resolve(__dirname, inputSchemaPath), 'utf8');
      const inputSchema = JSON.parse(inputSchemaString);
      const processor = new JsonSchemaInputProcessor();
      await expect(processor.process(inputSchema)).rejects.toThrow("Could not dereference $ref in input, is all the references correct?");
    });
  });

  describe('shouldProcess()', function () {
    test('should process input with correct $schema', async function () {
      const processor = new JsonSchemaInputProcessor();
      const shouldProcess = processor.shouldProcess({$schema: 'http://json-schema.org/draft-07/schema#'});
      expect(shouldProcess).toEqual(true);
    });
    test('should not process input with wrong $schema', async function () {
      const processor = new JsonSchemaInputProcessor();
      const shouldProcess = processor.shouldProcess({$schema: 'http://json-schema.org/draft-99/schema#'});
      expect(shouldProcess).toEqual(false);
    });
    test('should process input if $schema is not defined', async function () {
      const processor = new JsonSchemaInputProcessor();
      const shouldProcess = processor.shouldProcess({});
      expect(shouldProcess).toEqual(true);
    });
  });

  describe('schemaToCommonModel()', function () {
    const getCommonInput = (inputSchemaPath: string) => {
      const inputSchemaString = fs.readFileSync(path.resolve(__dirname, inputSchemaPath), 'utf8');
      const inferredSchema = JSON.parse(inputSchemaString);
      const inputSchema = Schema.toSchema(inferredSchema);
      return {inputSchema, commonInputModel: JsonSchemaInputProcessor.convertSchemaToCommonModel(inputSchema)};
    }
    test('should simplify schema and return a set of common models', async function () {
      const model = new CommonModel();
      model.$id = "test";
      (simplify as jest.Mock).mockImplementation(() => [model]);
      const inputSchemaPath = './JsonSchemaInputProcessor/basic.json';
      const {commonInputModel, inputSchema} = getCommonInput(inputSchemaPath);
      expect(simplify).toHaveBeenNthCalledWith(1, inputSchema);
      expect(commonInputModel).toEqual({"test" : {$id: "test"}});
    });
    test('should not contain duplicate models', async function () {
      const model1 = new CommonModel();
      model1.$id = "same";
      const model2 = new CommonModel();
      model2.$id = "same";
      (simplify as jest.Mock).mockImplementation(() => [model1, model2]);
      const inputSchemaPath = './JsonSchemaInputProcessor/basic.json';
      const {commonInputModel, inputSchema} = getCommonInput(inputSchemaPath);
      expect(simplify).toHaveBeenNthCalledWith(1, inputSchema);
      expect(commonInputModel).toEqual({"same": {$id: "same"}});
    });
  });

  describe('reflectSchemaName()', function () {
    test('should work', async function () {
      const schema = {
        properties: {
          prop: {
            type: "string",
          },
          allOfCase: {
            allOf: [
              {
                type: "string",
              },
              {
                type: "string",
              },
            ],
          },
          object: {
            type: "object",
            properties: {
              prop: {
                type: "string",
              },
            }
          },
          propWithObject: {
            type: "object",
            properties: {
              propWithObject: {
                type: "object",
              }
            }
          },
        },
        patternProperties: {
          patternProp: {
            type: "string",
          }
        },
        dependencies: {
          dep: {
            type: "string",
          },
        },
        definitions: {
          def: {
            type: "string",
          },
          oneOfCase: {
            oneOf: [
              {
                type: "string",
              },
              {
                type: "string",
              },
            ],
          },
        },
        anyOf: [
          {
            type: "string",
          },
          {
            type: "object",
            properties: {
              prop: {
                type: "string",
              },
            }
          },
        ]
      }
      const expected = JsonSchemaInputProcessor.reflectSchemaNames(schema, undefined, 'root', true) as any;

      // root
      expect(expected['x-modelgen-inferred-name']).toEqual('root');

      // properties
      expect(expected.properties.prop['x-modelgen-inferred-name']).toEqual('prop');
      expect(expected.properties.allOfCase.allOf[0]['x-modelgen-inferred-name']).toEqual('allOfCase_allOf_0');
      expect(expected.properties.allOfCase.allOf[1]['x-modelgen-inferred-name']).toEqual('allOfCase_allOf_1');
      expect(expected.properties.object['x-modelgen-inferred-name']).toEqual('object');
      expect(expected.properties.object.properties.prop['x-modelgen-inferred-name']).toEqual('object_prop');
      expect(expected.properties.propWithObject['x-modelgen-inferred-name']).toEqual('propWithObject');
      expect(expected.properties.propWithObject.properties.propWithObject['x-modelgen-inferred-name']).toEqual('propWithObject_propWithObject');

      // patternProperties
      expect(expected.patternProperties.patternProp['x-modelgen-inferred-name']).toEqual('pattern_property_0');

      // dependencies
      expect(expected.dependencies.dep['x-modelgen-inferred-name']).toEqual('dep');

      // definitions
      expect(expected.definitions.def['x-modelgen-inferred-name']).toEqual('def');
      expect(expected.definitions.oneOfCase.oneOf[0]['x-modelgen-inferred-name']).toEqual('oneOfCase_oneOf_0');
      expect(expected.definitions.oneOfCase.oneOf[1]['x-modelgen-inferred-name']).toEqual('oneOfCase_oneOf_1');

      // anyOf
      expect(expected.anyOf[0]['x-modelgen-inferred-name']).toEqual('anyOf_0');
      expect(expected.anyOf[1]['x-modelgen-inferred-name']).toEqual('anyOf_1');
      expect(expected.anyOf[1].properties.prop['x-modelgen-inferred-name']).toEqual('anyOf_1_prop');
    });
  });
});
