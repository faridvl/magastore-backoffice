import { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
    const { id } = ctx.params as { id: string };
    return {
        redirect: {
            destination: `/admin/logistics/${id}`,
            permanent: true,
        },
    };
};

export default function EditRedirect() {
    return null;
}
