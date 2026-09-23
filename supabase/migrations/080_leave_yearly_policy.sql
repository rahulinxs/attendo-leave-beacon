-- Annual leave policy and deduction settings
CREATE TABLE IF NOT EXISTS public.leave_yearly_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    total_allowed_leaves INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, year)
);

ALTER TABLE public.leave_types
    ADD COLUMN IF NOT EXISTS deduct_from_total_leave_balance BOOLEAN NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.update_leave_yearly_policies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_leave_yearly_policies_updated_at ON public.leave_yearly_policies;
CREATE TRIGGER update_leave_yearly_policies_updated_at
    BEFORE UPDATE ON public.leave_yearly_policies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_leave_yearly_policies_updated_at();

ALTER TABLE public.leave_yearly_policies ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'leave_yearly_policies' AND policyname = 'Company admins can manage yearly leave policies'
    ) THEN
        CREATE POLICY "Company admins can manage yearly leave policies"
            ON public.leave_yearly_policies
            FOR ALL
            USING (
                public.is_admin_or_super_admin() AND company_id = public.get_user_company_id()
            )
            WITH CHECK (
                public.is_admin_or_super_admin() AND company_id = public.get_user_company_id()
            );
    END IF;
END $$;

UPDATE public.leave_types
SET deduct_from_total_leave_balance = true
WHERE deduct_from_total_leave_balance IS NULL;
