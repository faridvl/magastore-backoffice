import { GetServerSideProps } from 'next';
import { routesPublic, routesPrivate } from '@/shared/navigation/routes';
import { CookiesManager } from '@/shared/utils/cookies-manager';

export const getServerSideProps: GetServerSideProps = async (context) => {
    const token = CookiesManager.getAccessToken(context);
    const role = CookiesManager.getUserRole(context);

    // 1. Si NO está logueado, lo mandamos al Login (o al catálogo si prefieres)
    if (!token) {
        return {
            redirect: {
                destination: routesPublic.login,
                permanent: false,
            },
        };
    }

    // 2. Si está logueado, redirigimos según su rol
    const destination = role === 'ADMIN'
        ? routesPrivate.admin.dashboard
        : routesPrivate.packages;

    return {
        redirect: {
            destination,
            permanent: false,
        },
    };
};

// No renderiza nada ya que siempre redirige desde el servidor
const IndexPage = () => null;

export default IndexPage;