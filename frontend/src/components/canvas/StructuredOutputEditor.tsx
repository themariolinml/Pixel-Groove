import { Plus, Trash2 } from 'lucide-react';

interface OutputField {
  name: string;
  type: string;
}

interface StructuredOutputEditorProps {
  outputMode: 'freetext' | 'structured';
  onModeChange: (mode: 'freetext' | 'structured') => void;
  outputFields: OutputField[];
  onFieldsChange: (fields: OutputField[]) => void;
  onBlur: () => void;
}

const FIELD_TYPES = ['string', 'number', 'boolean', 'array'] as const;
const MAX_FIELDS = 10;

export function StructuredOutputEditor({
  outputMode,
  onModeChange,
  outputFields,
  onFieldsChange,
  onBlur,
}: StructuredOutputEditorProps) {
  const handleFieldNameChange = (index: number, name: string) => {
    const next = [...outputFields];
    next[index] = { ...next[index], name };
    onFieldsChange(next);
  };

  const handleFieldTypeChange = (index: number, type: string) => {
    const next = [...outputFields];
    next[index] = { ...next[index], type };
    onFieldsChange(next);
  };

  const handleRemoveField = (index: number) => {
    onFieldsChange(outputFields.filter((_, j) => j !== index));
  };

  const handleAddField = () => {
    onFieldsChange([...outputFields, { name: '', type: 'string' }]);
  };

  return (
    <div className="space-y-2">
      {/* Mode toggle */}
      <div className="flex bg-black/30 rounded-lg p-0.5 border border-white/[0.08]">
        <button
          onClick={() => onModeChange('freetext')}
          className={`flex-1 text-[11px] font-medium py-1.5 rounded-md transition-all ${
            outputMode === 'freetext'
              ? 'bg-white/10 text-zinc-200'
              : 'text-zinc-500 hover:text-zinc-400'
          }`}
        >
          Free Text
        </button>
        <button
          onClick={() => onModeChange('structured')}
          className={`flex-1 text-[11px] font-medium py-1.5 rounded-md transition-all ${
            outputMode === 'structured'
              ? 'bg-white/10 text-zinc-200'
              : 'text-zinc-500 hover:text-zinc-400'
          }`}
        >
          Structured
        </button>
      </div>

      {/* Field editor */}
      {outputMode === 'structured' && (
        <div className="space-y-1.5">
          {outputFields.map((field, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <input
                type="text"
                value={field.name}
                onChange={e => handleFieldNameChange(i, e.target.value)}
                onBlur={onBlur}
                placeholder="field name"
                className="flex-1 bg-black/30 border border-white/[0.08] rounded-md px-2 py-1 text-[11px] text-zinc-200 placeholder-zinc-600 outline-none focus:border-white/20 min-w-0"
              />
              <select
                value={field.type}
                onChange={e => handleFieldTypeChange(i, e.target.value)}
                className="bg-black/30 border border-white/[0.08] rounded-md px-1.5 py-1 text-[11px] text-zinc-300 outline-none cursor-pointer"
              >
                {FIELD_TYPES.map(t => (
                  <option key={t} value={t} className="bg-[#1a1a1a]">{t}</option>
                ))}
              </select>
              <button
                onClick={() => handleRemoveField(i)}
                className="text-zinc-600 hover:text-red-400 transition-colors shrink-0"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <button
              onClick={handleAddField}
              disabled={outputFields.length >= MAX_FIELDS}
              className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Plus size={12} />
              Add field
            </button>
            <span className="text-[10px] text-zinc-600">{outputFields.length}/{MAX_FIELDS}</span>
          </div>
        </div>
      )}
    </div>
  );
}
