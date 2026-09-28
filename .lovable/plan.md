# Padronização de setores e endereços nos PDFs

## Resultado
- Exibir os setores avaliados em uma lista vertical com marcadores, evitando cortes em linhas longas.
- Padronizar nomes de setores e endereços digitados em caixa alta para escrita legível.
- Preservar siglas, números e abreviações comuns como RH, TI, SST, SP e CEP.

## Implementação
- Criar uma função compartilhada de formatação para nomes de setores e endereços.
- Aplicar a formatação nos relatórios psicossociais e nos documentos PGR/LTCAT onde esses dados aparecem.
- Ajustar o espaço do bloco de informações da empresa de acordo com a quantidade de setores.
- Validar a compilação e gerar visualmente um PDF de demonstração para conferir que não há cortes.
