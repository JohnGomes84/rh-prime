-- Seed inicial dos templates de documentos exigidos pelo catalog admission v1.0
-- Idempotente: INSERT ... ON DUPLICATE KEY UPDATE pela machine_key (UNIQUE)
-- Placeholders no padrao {{snake_case}} para substituicao server-side

INSERT INTO document_templates (templateName, templateType, content, placeholders, isActive, machine_key)
VALUES
('Contrato de Trabalho CLT', 'Outros',
'<h1 style="text-align:center">CONTRATO INDIVIDUAL DE TRABALHO POR PRAZO INDETERMINADO</h1>
<p>Pelo presente instrumento particular, de um lado:</p>
<p><strong>EMPREGADOR:</strong> {{empresa_nome}}, pessoa juridica de direito privado, inscrita no CNPJ sob o n.{{empresa_cnpj}}, com sede a {{empresa_endereco}}, doravante denominada EMPREGADORA;</p>
<p><strong>EMPREGADO:</strong> {{funcionario_nome}}, brasileiro(a), portador(a) do RG n.{{funcionario_rg}} e CPF n.{{funcionario_cpf}}, residente em {{funcionario_endereco}}, doravante denominado(a) EMPREGADO(A);</p>
<p>Firmam o presente contrato, que se rege pelas seguintes clausulas:</p>
<p><strong>CLAUSULA 1 - FUNCAO:</strong> O EMPREGADO sera admitido para exercer a funcao de <strong>{{cargo}}</strong>, no departamento de {{departamento}}, com obrigacao de cumprir as ordens e instrucoes do EMPREGADOR.</p>
<p><strong>CLAUSULA 2 - JORNADA:</strong> A jornada de trabalho sera de {{jornada_semanal}} horas semanais, distribuidas conforme escala da EMPREGADORA, respeitados os intervalos legais.</p>
<p><strong>CLAUSULA 3 - REMUNERACAO:</strong> O EMPREGADO recebera salario mensal de R$ {{salario}} ({{salario_extenso}}), pagos ate o 5o (quinto) dia util do mes subsequente.</p>
<p><strong>CLAUSULA 4 - INICIO:</strong> O presente contrato tem inicio em {{data_admissao}} e vigora por prazo indeterminado, observado o periodo de experiencia de 45 (quarenta e cinco) dias, prorrogavel por mais 45 dias.</p>
<p><strong>CLAUSULA 5 - LOCAL:</strong> O trabalho sera prestado em {{local_trabalho}}, podendo o EMPREGADOR transferi-lo a qualquer outro local, observada a legislacao vigente.</p>
<p><strong>CLAUSULA 6 - OBRIGACOES:</strong> O EMPREGADO compromete-se a cumprir o regulamento interno, normas de seguranca do trabalho, sigilo de informacoes e fidelidade ao EMPREGADOR.</p>
<p><strong>CLAUSULA 7 - RESCISAO:</strong> O contrato podera ser rescindido por qualquer das partes, conforme regras da CLT (Decreto-Lei 5.452/43), com aviso previo de 30 (trinta) dias.</p>
<p>E por estarem assim justos e contratados, firmam o presente em 2 (duas) vias de igual teor.</p>
<p style="margin-top:40px">{{cidade}}, {{data_atual}}.</p>
<p style="margin-top:60px">_______________________________<br>{{empresa_nome}}<br>EMPREGADOR</p>
<p style="margin-top:40px">_______________________________<br>{{funcionario_nome}}<br>EMPREGADO(A)</p>',
'["empresa_nome","empresa_cnpj","empresa_endereco","funcionario_nome","funcionario_rg","funcionario_cpf","funcionario_endereco","cargo","departamento","jornada_semanal","salario","salario_extenso","data_admissao","local_trabalho","cidade","data_atual"]',
1, 'contract_clt'),

('Termo de Confidencialidade (NDA)', 'Termo de Responsabilidade',
'<h1 style="text-align:center">TERMO DE CONFIDENCIALIDADE E SIGILO</h1>
<p>Pelo presente instrumento, {{funcionario_nome}}, CPF {{funcionario_cpf}}, doravante denominado(a) COLABORADOR(A), e {{empresa_nome}}, CNPJ {{empresa_cnpj}}, doravante denominada EMPRESA, celebram o presente Termo:</p>
<p><strong>1. OBJETO.</strong> O COLABORADOR(A) compromete-se a manter sigilo absoluto sobre toda e qualquer informacao confidencial da EMPRESA a que tiver acesso em razao do vinculo empregaticio.</p>
<p><strong>2. INFORMACAO CONFIDENCIAL.</strong> Sao consideradas confidenciais, sem se limitar: dados de clientes, planos comerciais, estrategias, codigo-fonte, segredos industriais, dados pessoais (LGPD), informacoes financeiras, salariais e quaisquer dados nao publicos.</p>
<p><strong>3. VIGENCIA.</strong> O dever de sigilo se estende por todo o periodo do vinculo e por 5 (cinco) anos apos seu termino, sob qualquer forma de cessacao.</p>
<p><strong>4. LGPD.</strong> O COLABORADOR(A) declara conhecer a Lei 13.709/2018 (LGPD) e se compromete a tratar dados pessoais somente para finalidades autorizadas, respeitando bases legais e direitos dos titulares.</p>
<p><strong>5. PENALIDADES.</strong> A violacao das obrigacoes deste Termo sujeita o(a) COLABORADOR(A) a responsabilizacao civil, criminal e trabalhista, sem prejuizo de demissao por justa causa (art. 482, alinea g, CLT).</p>
<p><strong>6. DEVOLUCAO.</strong> No termino do vinculo, o(a) COLABORADOR(A) devolvera imediatamente todo material da EMPRESA em seu poder.</p>
<p>E por estar de acordo, firma o presente.</p>
<p style="margin-top:40px">{{cidade}}, {{data_atual}}.</p>
<p style="margin-top:60px">_______________________________<br>{{funcionario_nome}}<br>COLABORADOR(A)</p>
<p style="margin-top:40px">_______________________________<br>{{empresa_nome}}<br>EMPRESA</p>',
'["funcionario_nome","funcionario_cpf","empresa_nome","empresa_cnpj","cidade","data_atual"]',
1, 'term_confidentiality'),

('Termo de Opcao - Vale-Transporte', 'Termo de Responsabilidade',
'<h1 style="text-align:center">TERMO DE OPCAO DE VALE-TRANSPORTE</h1>
<p>Eu, {{funcionario_nome}}, CPF {{funcionario_cpf}}, admitido(a) em {{data_admissao}} na empresa {{empresa_nome}} (CNPJ {{empresa_cnpj}}) para o cargo de {{cargo}}, declaro, para os fins do disposto na Lei 7.418/85 (Vale-Transporte) e regulamento, o seguinte:</p>
<p><strong>[ ] OPTO</strong> pelo recebimento do beneficio Vale-Transporte para deslocamento residencia-trabalho-residencia.</p>
<p>Itinerario declarado:</p>
<ul>
<li>Origem: {{endereco_origem}}</li>
<li>Destino: {{endereco_destino}}</li>
<li>Modais utilizados: {{modais}}</li>
<li>Quantidade diaria de passagens (ida e volta): {{qtd_passagens}}</li>
</ul>
<p>Autorizo o desconto mensal de ate 6% (seis por cento) do meu salario basico, conforme art. 4o, paragrafo unico, da Lei 7.418/85.</p>
<p><strong>[ ] DISPENSO</strong> o recebimento do beneficio Vale-Transporte, por possuir condicoes proprias de deslocamento.</p>
<p>Declaro a veracidade das informacoes prestadas e me comprometo a comunicar imediatamente qualquer alteracao no itinerario, sob pena das sancoes legais cabiveis (declaracao falsa - art. 7o do Decreto 95.247/87).</p>
<p style="margin-top:40px">{{cidade}}, {{data_atual}}.</p>
<p style="margin-top:60px">_______________________________<br>{{funcionario_nome}}<br>COLABORADOR(A)</p>',
'["funcionario_nome","funcionario_cpf","data_admissao","empresa_nome","empresa_cnpj","cargo","endereco_origem","endereco_destino","modais","qtd_passagens","cidade","data_atual"]',
1, 'term_vt'),

('Ordem de Servico - NR-1', 'Ordem de Serviço',
'<h1 style="text-align:center">ORDEM DE SERVICO DE SEGURANCA E SAUDE NO TRABALHO</h1>
<p style="text-align:center"><strong>Norma Regulamentadora NR-1 (Disposicoes Gerais e Gerenciamento de Riscos Ocupacionais)</strong></p>
<p><strong>EMPRESA:</strong> {{empresa_nome}} - CNPJ {{empresa_cnpj}}</p>
<p><strong>COLABORADOR(A):</strong> {{funcionario_nome}} - CPF {{funcionario_cpf}}</p>
<p><strong>CARGO:</strong> {{cargo}} - DEPARTAMENTO: {{departamento}}</p>
<p><strong>DATA DE ADMISSAO:</strong> {{data_admissao}}</p>
<hr>
<p><strong>1. RISCOS OCUPACIONAIS IDENTIFICADOS</strong></p>
<p>Conforme PGR (Programa de Gerenciamento de Riscos), os riscos associados a funcao sao:</p>
<ul>
<li>{{riscos_identificados}}</li>
</ul>
<p><strong>2. MEDIDAS DE PREVENCAO</strong></p>
<ul>
<li>Uso obrigatorio dos EPIs fornecidos pela EMPRESA</li>
<li>Cumprimento dos procedimentos operacionais padrao (POP)</li>
<li>Comunicacao imediata de condicoes inseguras ao supervisor / CIPA / SESMT</li>
<li>Participacao em treinamentos de seguranca (NR-6, NR-35 quando aplicavel)</li>
<li>Conhecimento e cumprimento do PGR e PCMSO</li>
</ul>
<p><strong>3. OBRIGACOES DO COLABORADOR</strong></p>
<ul>
<li>Cumprir as normas de seguranca e medicina do trabalho</li>
<li>Usar corretamente os EPIs fornecidos</li>
<li>Submeter-se aos exames medicos previstos (admissional, periodico, demissional)</li>
<li>Comunicar acidentes de trabalho ou doencas ocupacionais</li>
<li>Colaborar com a empresa na aplicacao das normas de SST</li>
</ul>
<p><strong>4. PENALIDADES</strong></p>
<p>A nao observancia das instrucoes desta OS constitui ato faltoso e sujeita o(a) COLABORADOR(A) as sancoes do art. 158, paragrafo unico, da CLT, podendo resultar em advertencia, suspensao ou demissao por justa causa.</p>
<hr>
<p>Declaro ter recebido, lido e compreendido o conteudo desta Ordem de Servico, comprometendo-me a cumprir as orientacoes nela contidas.</p>
<p style="margin-top:40px">{{cidade}}, {{data_atual}}.</p>
<p style="margin-top:60px">_______________________________<br>{{funcionario_nome}}<br>COLABORADOR(A)</p>
<p style="margin-top:40px">_______________________________<br>Responsavel SESMT / EMPRESA</p>',
'["empresa_nome","empresa_cnpj","funcionario_nome","funcionario_cpf","cargo","departamento","data_admissao","riscos_identificados","cidade","data_atual"]',
1, 'os_nr1'),

('Ficha Cadastral do Colaborador', 'Outros',
'<h1 style="text-align:center">FICHA CADASTRAL DO COLABORADOR</h1>
<p><strong>Empresa:</strong> {{empresa_nome}} - CNPJ {{empresa_cnpj}}</p>
<hr>
<h2 style="font-size:14px">1. Dados Pessoais</h2>
<p><strong>Nome completo:</strong> {{funcionario_nome}}</p>
<p><strong>CPF:</strong> {{funcionario_cpf}} &nbsp;&nbsp; <strong>RG:</strong> {{funcionario_rg}}</p>
<p><strong>Data de nascimento:</strong> ____/____/______ &nbsp;&nbsp; <strong>Sexo:</strong> [ ] M  [ ] F  [ ] Outro</p>
<p><strong>Estado civil:</strong> [ ] Solteiro(a)  [ ] Casado(a)  [ ] Uniao estavel  [ ] Divorciado(a)  [ ] Viuvo(a)</p>
<p><strong>Nacionalidade:</strong> ___________________ &nbsp;&nbsp; <strong>Naturalidade:</strong> ___________________</p>
<p><strong>Nome do pai:</strong> _____________________________________________</p>
<p><strong>Nome da mae:</strong> _____________________________________________</p>
<h2 style="font-size:14px">2. Endereco</h2>
<p><strong>Logradouro:</strong> {{funcionario_endereco}}</p>
<p><strong>Bairro:</strong> ___________________ &nbsp;&nbsp; <strong>Cidade/UF:</strong> ___________________ &nbsp;&nbsp; <strong>CEP:</strong> ___________</p>
<h2 style="font-size:14px">3. Contato</h2>
<p><strong>Telefone:</strong> ___________________ &nbsp;&nbsp; <strong>Celular:</strong> ___________________</p>
<p><strong>E-mail:</strong> _____________________________________________</p>
<h2 style="font-size:14px">4. Documentos</h2>
<p><strong>RG:</strong> {{funcionario_rg}} &nbsp;&nbsp; <strong>Orgao emissor/UF:</strong> ___________ &nbsp;&nbsp; <strong>Emissao:</strong> ____/____/______</p>
<p><strong>Titulo de eleitor:</strong> ___________________ &nbsp;&nbsp; <strong>Zona:</strong> _____ <strong>Secao:</strong> _____</p>
<p><strong>Reservista (homens):</strong> ___________________</p>
<p><strong>CTPS:</strong> _________ &nbsp;&nbsp; <strong>Serie:</strong> _________ &nbsp;&nbsp; <strong>PIS/PASEP:</strong> ___________________</p>
<p><strong>CNH:</strong> ___________________ &nbsp;&nbsp; <strong>Categoria:</strong> _____ <strong>Validade:</strong> ____/____/______</p>
<h2 style="font-size:14px">5. Dados Bancarios</h2>
<p><strong>Banco:</strong> ___________________ &nbsp;&nbsp; <strong>Agencia:</strong> _________ &nbsp;&nbsp; <strong>Conta:</strong> ___________________ &nbsp;&nbsp; <strong>Tipo:</strong> [ ] Corrente  [ ] Poupanca</p>
<p><strong>Chave Pix:</strong> _____________________________________________</p>
<h2 style="font-size:14px">6. Dados do Cargo</h2>
<p><strong>Cargo:</strong> {{cargo}} &nbsp;&nbsp; <strong>Departamento:</strong> {{departamento}}</p>
<p><strong>Data de admissao:</strong> {{data_admissao}} &nbsp;&nbsp; <strong>Salario:</strong> R$ {{salario}}</p>
<p><strong>Jornada semanal:</strong> {{jornada_semanal}}h</p>
<h2 style="font-size:14px">7. Dependentes (se houver)</h2>
<p>Nome: ___________________________________  CPF: _______________  Data nasc.: ____/____/______  Grau: __________</p>
<p>Nome: ___________________________________  CPF: _______________  Data nasc.: ____/____/______  Grau: __________</p>
<p>Nome: ___________________________________  CPF: _______________  Data nasc.: ____/____/______  Grau: __________</p>
<h2 style="font-size:14px">8. Contato de Emergencia</h2>
<p><strong>Nome:</strong> ___________________________________ &nbsp;&nbsp; <strong>Parentesco:</strong> ___________________</p>
<p><strong>Telefone:</strong> ___________________</p>
<hr>
<p>Declaro que as informacoes prestadas sao verdadeiras e me comprometo a comunicar imediatamente qualquer alteracao.</p>
<p style="margin-top:40px">{{cidade}}, {{data_atual}}.</p>
<p style="margin-top:60px">_______________________________<br>{{funcionario_nome}}<br>COLABORADOR(A)</p>',
'["empresa_nome","empresa_cnpj","funcionario_nome","funcionario_cpf","funcionario_rg","funcionario_endereco","cargo","departamento","data_admissao","salario","jornada_semanal","cidade","data_atual"]',
1, 'ficha_cadastral')
ON DUPLICATE KEY UPDATE
templateName = VALUES(templateName),
templateType = VALUES(templateType),
content = VALUES(content),
placeholders = VALUES(placeholders),
isActive = VALUES(isActive);
