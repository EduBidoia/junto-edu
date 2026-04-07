-- Adiciona token de acesso único por filho
ALTER TABLE children
  ADD COLUMN IF NOT EXISTS access_token uuid DEFAULT gen_random_uuid() UNIQUE NOT NULL;

-- Garante que linhas antigas também tenham token
UPDATE children SET access_token = gen_random_uuid() WHERE access_token IS NULL;

-- Função com SECURITY DEFINER para buscar filho pelo token publicamente
-- (contorna RLS sem expor todos os dados da tabela)
CREATE OR REPLACE FUNCTION get_child_by_access_token(p_token uuid)
RETURNS TABLE(id uuid, name text, grade text, age integer, tenant_id uuid)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT id, name, grade, age, tenant_id
  FROM children
  WHERE access_token = p_token
  LIMIT 1;
$$;
