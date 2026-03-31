
    export type RemoteKeys = 'REMOTE_ALIAS_IDENTIFIER/ActionVisu';
    type PackageType<T> = T extends 'REMOTE_ALIAS_IDENTIFIER/ActionVisu' ? typeof import('REMOTE_ALIAS_IDENTIFIER/ActionVisu') :any;