import React from 'react';
import NextImage, { ImageProps as NextImageProps } from 'next/image';

type CustomImageProps = {
    containerClassName?: string;
}

type ImageProps = NextImageProps & CustomImageProps;

const Image: React.FC<ImageProps> = ({
    containerClassName,
    src,
    ...nextImageProps
}: ImageProps) => {
    if (!src) {
        return null;
    }

    return (
        <div className={containerClassName}>
            <NextImage src={src} {...nextImageProps} />
        </div>
    );
};

export default Image;
