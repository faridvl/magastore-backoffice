import React from 'react';
import Head from 'next/head';
import { unauthorizeServerSidePage } from '@/hocs/auth';
import { LoginContainer } from '@/components/containers/login-container/login-container';

const LoginPage: React.FC = () => {
    return (
        <>
            <Head>
                <title>Acceso al Panel | Magastore</title>
            </Head>
            <LoginContainer />
        </>
    );
};

// Esto asegura que si ya están logueados, no puedan ver el login y los mande al dashboard
export const getServerSideProps = unauthorizeServerSidePage();

export default LoginPage;