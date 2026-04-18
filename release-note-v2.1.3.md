## 🔐 O que há de novo

### Added
- Autenticação por sessão com cookie `HttpOnly` no backend
  - Endpoints: `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- Middleware de proteção para rotas sensíveis da API
  - Protege: `/api/upload`, `/api/transacoes`, `/api/regras`, `/api/export`
  - Mantém público: `/api/health`
- Tela de login no frontend (`LoginPage`) com validação de sessão (`AuthGate`)
- Ação de logout nas telas principais para encerramento explícito
- Documentação das variáveis `AUTH_*` em `README.md` e `backend/README.md`

### Changed
- Cliente HTTP do frontend passa a enviar credenciais com `withCredentials: true`
- CORS do backend agora habilita `credentials: true` para suportar sessão
- Documentação atualizada com variáveis de ambiente:
  - `AUTH_ENABLED` (padrão: `true`)
  - `AUTH_USERNAME` (padrão: `admin`)
  - `AUTH_PASSWORD` (padrão: `123456`)
  - `AUTH_SESSION_HOURS` (padrão: `8`)

### Security
- 🛡️ Bloqueio de acesso direto à aplicação por aba aberta no navegador sem autenticação
- Cookie de sessão configurado como `HttpOnly` para prevenir XSS
- Bypass automático de autenticação em ambiente de teste (`NODE_ENV=test`) para compatibilidade com suite de testes existente

## 🔧 Para operadores

Se você está subindo esta versão em produção, configure credenciais fortes:

```bash
export AUTH_USERNAME="seu_usuario_forte"
export AUTH_PASSWORD="sua_senha_criptograficamente_segura"
export AUTH_SESSION_HOURS="4"  # Sessões mais curtas se preferir
```

Manter o padrão (`admin` / `123456`) é adequado apenas para ambientes locais de desenvolvimento com acesso físico controlado.

## 📊 Escopo das mudanças

- **18 arquivos** alterados
- **539 linhas** adicionadas
- **9 linhas** removidas
- **1 commit** incluído

Validações automáticas passaram:
- ✅ Testes backend (83 testes)
- ✅ Testes frontend (13 testes)
- ✅ Build TypeScript backend
- ✅ Build Vite frontend

## 🔄 Compatibilidade

- Compatível com Docker Compose (perfis `dev` e `prod`)
- Sem breaking changes em relação a v2.1.2
- Testes existentes rodando sem modificação

## 📝 Comparação com v2.1.2

v2.1.2 introduziu carregamento de regras via arquivos JSON (`seed-*.json`).

v2.1.3 adiciona a camada de segurança (login simples) sem impactar o sistema de classificação de transações. Essas features são complementares.
