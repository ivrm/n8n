import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useNDVStore } from '@/stores/ndv.store';
import { useFocusPanelStore } from '@/stores/focusPanel.store';
import { useNodeSettingsParameters } from './useNodeSettingsParameters';
import type { INodeProperties } from 'n8n-workflow';
import type { MockedStore } from '@/__tests__/utils';
import { mockedStore } from '@/__tests__/utils';
import type { INodeUi } from '@/Interface';
import { CUSTOM_API_CALL_KEY } from '@/constants';

describe('useNodeSettingsParameters', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	describe('setValue', () => {
		afterEach(() => {
			vi.clearAllMocks();
		});

		it('mutates nodeValues as expected', () => {
			const nodeSettingsParameters = useNodeSettingsParameters();

			expect(nodeSettingsParameters.nodeValues.value.color).toBe('#ff0000');
			expect(nodeSettingsParameters.nodeValues.value.parameters).toEqual({});

			nodeSettingsParameters.setValue('color', '#ffffff');

			expect(nodeSettingsParameters.nodeValues.value.color).toBe('#ffffff');
			expect(nodeSettingsParameters.nodeValues.value.parameters).toEqual({});

			nodeSettingsParameters.setValue('parameters.key', 3);

			expect(nodeSettingsParameters.nodeValues.value.parameters).toEqual({ key: 3 });

			nodeSettingsParameters.nodeValues.value = { parameters: { some: { nested: {} } } };
			nodeSettingsParameters.setValue('parameters.some.nested.key', true);

			expect(nodeSettingsParameters.nodeValues.value.parameters).toEqual({
				some: { nested: { key: true } },
			});

			nodeSettingsParameters.setValue('parameters', null);

			expect(nodeSettingsParameters.nodeValues.value.parameters).toBe(undefined);

			nodeSettingsParameters.setValue('newProperty', 'newValue');

			expect(nodeSettingsParameters.nodeValues.value.newProperty).toBe('newValue');
		});
	});

	describe('handleFocus', () => {
		let ndvStore: MockedStore<typeof useNDVStore>;
		let focusPanelStore: MockedStore<typeof useFocusPanelStore>;

		beforeEach(() => {
			vi.clearAllMocks();

			ndvStore = mockedStore(useNDVStore);
			focusPanelStore = mockedStore(useFocusPanelStore);

			ndvStore.activeNode = {
				id: '123',
				name: 'myParam',
				parameters: {},
				position: [0, 0],
				type: 'test',
				typeVersion: 1,
			};
			ndvStore.activeNodeName = 'Node1';
			ndvStore.setActiveNodeName = vi.fn();
			ndvStore.resetNDVPushRef = vi.fn();
			focusPanelStore.setFocusedNodeParameter = vi.fn();
			focusPanelStore.focusPanelActive = false;
		});

		it('sets focused node parameter and activates panel', () => {
			const { handleFocus } = useNodeSettingsParameters();
			const node: INodeUi = {
				id: '1',
				name: 'Node1',
				position: [0, 0],
				typeVersion: 1,
				type: 'test',
				parameters: {},
			};
			const path = 'parameters.foo';
			const parameter: INodeProperties = {
				name: 'foo',
				displayName: 'Foo',
				type: 'string',
				default: '',
			};

			handleFocus(node, path, parameter);

			expect(focusPanelStore.setFocusedNodeParameter).toHaveBeenCalledWith({
				nodeId: node.id,
				parameterPath: path,
				parameter,
			});
			expect(focusPanelStore.focusPanelActive).toBe(true);

			expect(ndvStore.setActiveNodeName).toHaveBeenCalledWith(null);
			expect(ndvStore.resetNDVPushRef).toHaveBeenCalled();
		});

		it('does nothing if node is undefined', () => {
			const { handleFocus } = useNodeSettingsParameters();

			const parameter: INodeProperties = {
				name: 'foo',
				displayName: 'Foo',
				type: 'string',
				default: '',
			};

			handleFocus(undefined, 'parameters.foo', parameter);

			expect(focusPanelStore.setFocusedNodeParameter).not.toHaveBeenCalled();
		});
	});

	describe('shouldSkipParamValidation', () => {
		describe('CUSTOM_API_CALL_KEY detection', () => {
			it('should skip validation when value is CUSTOM_API_CALL_KEY', () => {
				const { shouldSkipParamValidation } = useNodeSettingsParameters();

				const parameter: INodeProperties = {
					name: 'testParam',
					displayName: 'Test Parameter',
					type: 'string',
					default: '',
				};

				const result = shouldSkipParamValidation(parameter, CUSTOM_API_CALL_KEY);
				expect(result).toBe(true);
			});

			it('should skip validation when value is a string containing CUSTOM_API_CALL_KEY', () => {
				const { shouldSkipParamValidation } = useNodeSettingsParameters();

				const parameter: INodeProperties = {
					name: 'testParam',
					displayName: 'Test Parameter',
					type: 'string',
					default: '',
				};

				const valueWithKey = `some prefix ${CUSTOM_API_CALL_KEY} some suffix`;
				const result = shouldSkipParamValidation(parameter, valueWithKey);
				expect(result).toBe(true);
			});

			it('should not skip validation when value is a string not containing CUSTOM_API_CALL_KEY', () => {
				const { shouldSkipParamValidation } = useNodeSettingsParameters();

				const parameter: INodeProperties = {
					name: 'testParam',
					displayName: 'Test Parameter',
					type: 'string',
					default: '',
				};

				const result = shouldSkipParamValidation(parameter, 'regular string value');
				expect(result).toBe(false);
			});
		});

		describe('options parameter type with allowArbitraryValues', () => {
			it('should skip validation for options parameter with allowArbitraryValues=true', () => {
				const { shouldSkipParamValidation } = useNodeSettingsParameters();

				const parameter: INodeProperties = {
					name: 'optionsParam',
					displayName: 'Options Parameter',
					type: 'options',
					options: [
						{ name: 'Option 1', value: 'option1' },
						{ name: 'Option 2', value: 'option2' },
					],
					allowArbitraryValues: true,
					default: '',
				};

				const result = shouldSkipParamValidation(parameter, 'arbitrary_value');
				expect(result).toBe(true);
			});

			it('should not skip validation for options parameter with allowArbitraryValues=false', () => {
				const { shouldSkipParamValidation } = useNodeSettingsParameters();

				const parameter: INodeProperties = {
					name: 'optionsParam',
					displayName: 'Options Parameter',
					type: 'options',
					options: [
						{ name: 'Option 1', value: 'option1' },
						{ name: 'Option 2', value: 'option2' },
					],
					allowArbitraryValues: false,
					default: '',
				};

				const result = shouldSkipParamValidation(parameter, 'arbitrary_value');
				expect(result).toBe(false);
			});

			it('should not skip validation for options parameter with allowArbitraryValues=undefined', () => {
				const { shouldSkipParamValidation } = useNodeSettingsParameters();

				const parameter: INodeProperties = {
					name: 'optionsParam',
					displayName: 'Options Parameter',
					type: 'options',
					options: [
						{ name: 'Option 1', value: 'option1' },
						{ name: 'Option 2', value: 'option2' },
					],
					default: '',
				};

				const result = shouldSkipParamValidation(parameter, 'arbitrary_value');
				expect(result).toBe(false);
			});
		});

		describe('multiOptions parameter type with allowArbitraryValues', () => {
			it('should skip validation for multiOptions parameter with allowArbitraryValues=true', () => {
				const { shouldSkipParamValidation } = useNodeSettingsParameters();

				const parameter: INodeProperties = {
					name: 'multiOptionsParam',
					displayName: 'Multi Options Parameter',
					type: 'multiOptions',
					options: [
						{ name: 'Option 1', value: 'option1' },
						{ name: 'Option 2', value: 'option2' },
					],
					allowArbitraryValues: true,
					default: [],
				};

				const result = shouldSkipParamValidation(parameter, ['arbitrary_value']);
				expect(result).toBe(true);
			});

			it('should not skip validation for multiOptions parameter with allowArbitraryValues=false', () => {
				const { shouldSkipParamValidation } = useNodeSettingsParameters();

				const parameter: INodeProperties = {
					name: 'multiOptionsParam',
					displayName: 'Multi Options Parameter',
					type: 'multiOptions',
					options: [
						{ name: 'Option 1', value: 'option1' },
						{ name: 'Option 2', value: 'option2' },
					],
					allowArbitraryValues: false,
					default: [],
				};

				const result = shouldSkipParamValidation(parameter, ['arbitrary_value']);
				expect(result).toBe(false);
			});
		});

		describe('non-options parameter types', () => {
			const nonOptionsParameterTypes = [
				'string',
				'number',
				'boolean',
				'json',
				'dateTime',
				'color',
			] as Array<INodeProperties['type']>;

			nonOptionsParameterTypes.forEach((type) => {
				it(`should not skip validation for ${type} parameter type regardless of allowArbitraryValues`, () => {
					const { shouldSkipParamValidation } = useNodeSettingsParameters();

					const parameter: INodeProperties = {
						name: 'testParam',
						displayName: 'Test Parameter',
						type,
						allowArbitraryValues: true,
						default: '',
					};

					const result = shouldSkipParamValidation(parameter, 'test_value');
					expect(result).toBe(false);
				});
			});
		});
	});
});
