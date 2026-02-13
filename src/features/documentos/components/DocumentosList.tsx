import { ArrowRight, Barcode, Paperclip, Eye, Reply } from 'lucide-react';
import { U } from '../../../utils';
import { TableWithShowMore } from '../../../components/ui/Shared';

interface DocumentosListProps {
    data: any[];
    onExcluir: (id: string) => void;
    onVisualizar: (item: any) => void;
    onResponder: (item: any) => void;
}

export const DocumentosList = ({ data, onExcluir, onVisualizar, onResponder }: DocumentosListProps) => {
    
  const getBadgeColor = (tipo: string) => { 
      if (tipo === 'Nota Fiscal') return 'bg-blue-100 text-blue-800 border-blue-200'; 
      if (tipo.includes('Resposta')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      if (tipo === 'Boleto') return 'bg-red-100 text-red-800 border-red-200'; 
      return 'bg-gray-100 text-gray-800 border-gray-200'; 
  };

  return (
    <div className="bg-white rounded-lg border-2 overflow-hidden shadow-sm">
      <div className="p-3 border-b bg-gray-50">
          <h2 className="font-bold text-sm uppercase text-gray-600">Central de Documentos</h2>
      </div>
      <TableWithShowMore data={data}>
          {(items:any[], Row:any) => (
              <>
                  <thead className="bg-gray-50">
                      <tr>
                          <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">Doc / Info</th>
                          <th className="px-3 py-2 text-center text-xs font-bold text-gray-500">Tramitação</th>
                          <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">Ações</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y">
                      {items.map(item => (
                          <Row key={item.id} onDelete={() => onExcluir(item.id)}>
                              <td className="px-3 py-2 text-gray-700">
                                  <div className="flex items-center gap-2 mb-1">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getBadgeColor(item.tipo)}`}>{item.tipo}</span>
                                      <span className="text-[10px] text-gray-400">{U.formatDate(item.data)}</span>
                                  </div>
                                  <div className="font-bold text-sm text-gray-800 leading-tight">{item.nome}</div>
                                  {item.codigo && <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-1"><Barcode className="w-3 h-3"/> {item.codigo}</div>}
                                  {/* Link visual para o anexo */}
                                  {item.arquivo && item.arquivo !== 'Sem anexo' && (
                                      <div className="text-[10px] text-blue-600 flex items-center gap-1 mt-0.5 cursor-pointer hover:underline" onClick={() => onVisualizar(item)}>
                                          <Paperclip className="w-3 h-3"/> {item.arquivo}
                                      </div>
                                  )}
                              </td>
                              
                              <td className="px-3 py-2 text-center">
                                  <div className="flex flex-col items-center justify-center text-[10px] font-medium text-gray-600 bg-gray-50 p-1 rounded border">
                                      <span>{item.remetente || 'Rural'}</span>
                                      <ArrowRight className="w-3 h-3 text-gray-400 my-0.5" />
                                      <span>{item.destinatario || 'Adm'}</span>
                                  </div>
                                  {item.parentId && <span className="text-[9px] bg-yellow-100 text-yellow-800 px-1 rounded mt-1 inline-block">Resposta</span>}
                              </td>

                              <td className="px-3 py-2 text-right">
                                  <div className="flex justify-end gap-1">
                                      <button 
                                          onClick={() => onVisualizar(item)}
                                          className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors inline-flex"
                                          title="Visualizar Anexo"
                                      >
                                          <Eye className="w-4 h-4" />
                                      </button>

                                      <button 
                                          onClick={() => onResponder(item)}
                                          className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors inline-flex"
                                          title="Responder / Anexar"
                                      >
                                          <Reply className="w-4 h-4" />
                                      </button>
                                  </div>
                              </td>
                          </Row>
                      ))}
                  </tbody>
              </>
          )}
      </TableWithShowMore>
    </div>
  );
};
