import React from 'react';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TableSortLabel,
    IconButton,
    Select,
    MenuItem,
    TextField,
} from '@mui/material';

import {
    Edit as IconEdit,
    Delete as IconDelete,
    NavigateNext as IconExpand,
    ExpandMore as IconCollapse,
    Check as IconCheck,
    Close as IconClose,
} from '@mui/icons-material';
import type { IobTheme } from '@iobroker/adapter-react-v5';

function getAttr(obj: Record<string, any>, attr: string | string[], lookup?: Record<string, string>): any {
    if (typeof attr === 'string') {
        attr = attr.split('.');
    }

    if (!obj) {
        return null;
    }

    if (attr.length === 1) {
        if (lookup && lookup[obj[attr[0]]]) {
            return lookup[obj[attr[0]]];
        }
        return obj[attr[0]];
    }
    const name = attr.shift() || '';
    return getAttr(obj[name], attr);
}

function setAttr(obj: Record<string, any>, attr: string | string[], value: any): void {
    if (typeof attr === 'string') {
        attr = attr.split('.');
    }

    if (attr.length === 1) {
        return (obj[attr[0]] = value);
    }
    const name = attr.shift() || '';
    if (obj[name] === null || obj[name] === undefined) {
        obj[name] = {};
    }
    return setAttr(obj[name], attr, value);
}

const styles: Record<string, any> = {
    tableContainer: {
        width: '100%',
        height: '100%',
        overflow: 'auto',
    },
    table: {
        width: '100%',
        minWidth: 800,
        maxWidth: 1920,
    },
    cell: {
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 4,
        paddingRight: 4,
    },
    rowMainWithChildren: {},
    rowMainWithoutChildren: {},
    rowNoEdit: {
        opacity: 0.3,
    },
    cellExpand: {
        width: 30,
    },
    cellButton: {
        width: 30,
    },
    cellHeader: (theme: IobTheme): React.CSSProperties => ({
        fontWeight: 'bold',
        background: theme.palette.mode === 'dark' ? '#888' : '#888',
        color: theme.palette.mode === 'dark' ? '#EEE' : '#111',
        height: 48,
        wordBreak: 'break-word',
        whiteSpace: 'pre',
    }),
    width_name_nicknames: {
        maxWidth: 150,
    },
    width_ioType: {
        maxWidth: 100,
    },
    width_type: {
        maxWidth: 100,
    },
    width_displayTraits: {
        maxWidth: 100,
    },
    width_roomHint: {
        maxWidth: 100,
    },
    rowSecondary: {
        fontStyle: 'italic',
    },
    cellSecondary: {
        fontSize: 10,
    },
    visuallyHidden: {
        border: 0,
        clip: 'rect(0 0 0 0)',
        height: 1,
        margin: -1,
        overflow: 'hidden',
        padding: 0,
        position: 'absolute',
        top: 20,
        width: 1,
    },
};

function descendingComparator(
    a: Record<string, any>,
    b: Record<string, any>,
    orderBy: string,
    lookup?: Record<string, string>,
): 1 | 0 | -1 {
    const _a = getAttr(a, orderBy, lookup) || '';
    const _b = getAttr(b, orderBy, lookup) || '';

    if (_b < _a) {
        return -1;
    }
    if (_b > _a) {
        return 1;
    }
    return 0;
}

function getComparator(
    order: 'asc' | 'desc',
    orderBy: string,
    lookup?: Record<string, string>,
): (a: Record<string, any>, b: Record<string, any>) => -1 | 0 | 1 {
    return order === 'desc'
        ? (a: Record<string, any>, b: Record<string, any>) => descendingComparator(a, b, orderBy, lookup)
        : (a: Record<string, any>, b: Record<string, any>) =>
              -descendingComparator(a, b, orderBy, lookup) as -1 | 0 | 1;
}

function stableSort(
    array: Record<string, any>[],
    comparator: (a: Record<string, any>, b: Record<string, any>) => -1 | 0 | 1,
) {
    const stabilizedThis: [el: Record<string, any>, index: number][] = array.map((el, index) => [el, index]);

    stabilizedThis.sort((a, b) => {
        const order = comparator(a[0], b[0]);
        if (order) {
            return order;
        }
        return a[1] - b[1];
    });

    return stabilizedThis.map(el => el[0]);
}

interface TreeTableProps {
    data: Record<string, any>[];
    className?: string;
    //    loading?: boolean;
    columns: {
        field: string;
        title: string;
        editable?: 'never';
        lookup?: Record<string, string>;
        cellStyle?: React.CSSProperties;
    }[];
    onUpdate: (newData: Record<string, any>, oldData: Record<string, any>) => void;
    onDelete: (oldData: Record<string, any>) => void;
    //    themeType: ThemeType;
    style?: React.CSSProperties;
}

interface TreeTableState {
    opened: string[];
    editMode: false | number;
    deleteMode: false | number;
    editData: null | Record<string, any>;
    order: 'asc' | 'desc';
    orderBy: string;
}

export default class TreeTable extends React.Component<TreeTableProps, TreeTableState> {
    constructor(props: TreeTableProps) {
        super(props);

        let openedStr = window.localStorage.getItem('iot.ghome.opened') || '[]';
        let opened: string[];
        try {
            opened = JSON.parse(openedStr) || [];
        } catch (e) {
            opened = [];
        }
        if (!Array.isArray(opened)) {
            opened = [];
        }

        this.state = {
            opened,
            editMode: false,
            deleteMode: false,
            editData: null,
            order: 'asc',
            orderBy: this.props.columns[0].field,
        };
    }

    renderCell(
        item: Record<string, any>,
        col: TreeTableProps['columns'][0],
        level: number,
        i: number,
    ): React.JSX.Element {
        if (this.state.editMode === i && col.editable !== 'never') {
            let val = getAttr(item, col.field);
            if (Array.isArray(val)) {
                val = val[0];
            }
            return (
                <TableCell
                    key={col.field}
                    style={{ ...styles.cell, ...(level ? styles.cellSecondary : undefined), ...col.cellStyle }}
                    component="th"
                >
                    {col.lookup ? (
                        <Select
                            variant="standard"
                            onChange={e => {
                                const editData = this.state.editData ? { ...this.state.editData } : {};
                                if (e.target.value === val) {
                                    delete editData[col.field];
                                } else {
                                    editData[col.field] = e.target.value;
                                }
                                this.setState({ editData });
                            }}
                            value={(this.state.editData && this.state.editData[col.field]) || val}
                        >
                            {Object.keys(col.lookup).map(v => (
                                <MenuItem value={v}>{col.lookup![v]}</MenuItem>
                            ))}
                        </Select>
                    ) : (
                        <TextField
                            variant="standard"
                            value={
                                this.state.editData && this.state.editData[col.field] !== undefined
                                    ? this.state.editData[col.field]
                                    : val
                            }
                            onChange={e => {
                                const editData = this.state.editData ? { ...this.state.editData } : {};
                                if (e.target.value === val) {
                                    delete editData[col.field];
                                } else {
                                    editData[col.field] = e.target.value;
                                }
                                this.setState({ editData });
                            }}
                        />
                    )}
                </TableCell>
            );
        }
        return (
            <TableCell
                key={col.field}
                style={{ ...styles.cell, ...(level ? styles.cellSecondary : undefined), ...col.cellStyle }}
                component="th"
            >
                {getAttr(item, col.field, col.lookup)}
            </TableCell>
        );
    }

    renderLine(item: Record<string, any>, level?: number): null | (React.JSX.Element | null)[] {
        level ||= 0;
        const i = this.props.data.indexOf(item);
        if (!item) {
            return null;
        }
        if (!level && item.parentId) {
            return null;
        }
        if (level && !item.parentId) {
            return null; // should never happen
        }
        // try to find children
        const children = this.props.data.filter(it => it.parentId === item.id);
        const opened = this.state.opened.includes(item.id);

        return [
            <TableRow
                key={item.id}
                style={{
                    ...styles.row,
                    ...(level ? styles.rowSecondary : undefined),
                    ...(!level && children.length ? styles.rowMainWithChildren : undefined),
                    ...(!level && !children.length ? styles.rowMainWithoutChildren : undefined),
                    ...(this.state.editMode !== false && this.state.editMode !== i ? styles.rowNoEdit : undefined),
                    ...(this.state.deleteMode !== false && this.state.deleteMode !== i ? styles.rowNoEdit : undefined),
                }}
            >
                <TableCell
                    style={{
                        ...styles.cell,
                        ...styles.cellExpand,
                        ...(level ? styles.cellSecondary : undefined),
                    }}
                >
                    {children.length ? (
                        <IconButton
                            onClick={() => {
                                const _opened = [...this.state.opened];
                                const pos = _opened.indexOf(item.id);
                                if (pos === -1) {
                                    _opened.push(item.id);
                                    _opened.sort();
                                } else {
                                    _opened.splice(pos, 1);
                                }

                                this.setState({ opened: _opened });
                            }}
                        >
                            {opened ? <IconCollapse /> : <IconExpand />}
                        </IconButton>
                    ) : null}
                </TableCell>
                <TableCell
                    scope="row"
                    style={{
                        ...styles.cell,
                        ...(level ? styles.cellSecondary : undefined),
                        ...this.props.columns[0].cellStyle,
                    }}
                >
                    {getAttr(item, this.props.columns[0].field, this.props.columns[0].lookup)}
                </TableCell>
                {this.props.columns.map((col, ii) => (!ii ? null : this.renderCell(item, col, level, i)))}
                <TableCell style={{ ...styles.cell, ...styles.cellButton }}>
                    {this.state.editMode === i || this.state.deleteMode === i ? (
                        <IconButton
                            disabled={
                                this.state.editMode !== false &&
                                (!this.state.editData || !Object.keys(this.state.editData).length)
                            }
                            onClick={() => {
                                if (this.state.editMode !== false) {
                                    const newData = JSON.parse(JSON.stringify(item));
                                    if (this.state.editData) {
                                        Object.keys(this.state.editData).forEach(attr =>
                                            setAttr(newData, attr, this.state.editData![attr]),
                                        );
                                    }
                                    this.setState({ editMode: false }, () => this.props.onUpdate(newData, item));
                                } else {
                                    this.setState({ deleteMode: false }, () => this.props.onDelete(item));
                                }
                            }}
                        >
                            <IconCheck />
                        </IconButton>
                    ) : (
                        <IconButton
                            disabled={this.state.editMode !== false}
                            onClick={() => this.setState({ editMode: i, editData: null })}
                        >
                            <IconEdit />
                        </IconButton>
                    )}
                </TableCell>
                <TableCell style={{ ...styles.cell, ...styles.cellButton }}>
                    {this.state.editMode === i || this.state.deleteMode === i ? (
                        <IconButton onClick={() => this.setState({ editMode: false, deleteMode: false })}>
                            <IconClose />
                        </IconButton>
                    ) : (
                        <IconButton
                            disabled={this.state.deleteMode !== false}
                            onClick={() => this.setState({ deleteMode: i })}
                        >
                            <IconDelete />
                        </IconButton>
                    )}
                </TableCell>
            </TableRow>,
            !level && this.state.opened.includes(item.id)
                ? (children.map(_item => this.renderLine(_item, level + 1)) as unknown as React.JSX.Element)
                : null,
        ];
    }

    handleRequestSort(property: string): void {
        const isAsc = this.state.orderBy === property && this.state.order === 'asc';
        this.setState({ order: isAsc ? 'desc' : 'asc', orderBy: property });
    }

    renderHead() {
        return (
            <TableHead>
                <TableRow>
                    <TableCell
                        component="th"
                        sx={styles.cellHeader}
                        style={{ ...styles.cell, ...styles.cellExpand }}
                    />
                    <TableCell
                        component="th"
                        sx={styles.cellHeader}
                        style={{
                            ...styles.cell,
                            ...styles[`width_${this.props.columns[0].field.replace(/\./g, '_')}`],
                            ...(this.props.columns[0].cellStyle || undefined),
                        }}
                        sortDirection={this.state.orderBy === this.props.columns[0].field ? this.state.order : false}
                    >
                        <TableSortLabel
                            active={this.state.orderBy === this.props.columns[0].field}
                            direction={this.state.orderBy === this.props.columns[0].field ? this.state.order : 'asc'}
                            onClick={() => this.handleRequestSort(this.props.columns[0].field)}
                        >
                            {this.props.columns[0].title}
                            {this.state.orderBy === this.props.columns[0].field ? (
                                <span style={styles.visuallyHidden}>
                                    {this.state.order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                </span>
                            ) : null}
                        </TableSortLabel>
                    </TableCell>
                    {this.props.columns.map((col, i) =>
                        !i ? null : (
                            <TableCell
                                key={col.field}
                                sx={styles.cellHeader}
                                style={{
                                    ...styles.cell,
                                    ...styles[`width_${col.field.replace(/\./g, '_')}`],
                                    ...col.cellStyle,
                                }}
                                component="th"
                            >
                                <TableSortLabel
                                    active={this.state.orderBy === col.field}
                                    direction={this.state.orderBy === col.field ? this.state.order : 'asc'}
                                    onClick={() => this.handleRequestSort(col.field)}
                                >
                                    {col.title}
                                    {this.state.orderBy === col.field ? (
                                        <span style={styles.visuallyHidden}>
                                            {this.state.order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                                        </span>
                                    ) : null}
                                </TableSortLabel>
                            </TableCell>
                        ),
                    )}
                    <TableCell
                        component="th"
                        sx={styles.cellHeader}
                        style={{ ...styles.cell, ...styles.cellButton }}
                    />
                    <TableCell
                        component="th"
                        sx={styles.cellHeader}
                        style={{ ...styles.cell, ...styles.cellButton }}
                    />
                </TableRow>
            </TableHead>
        );
    }

    render():React.JSX.Element {
        const lookup = this.props.columns
            ? this.props.columns.find(col => col.field === this.state.orderBy)?.lookup
            : undefined;
        const table = stableSort(this.props.data, getComparator(this.state.order, this.state.orderBy, lookup));

        return (
            <div
                style={{ ...styles.tableContainer, ...(this.props.style || undefined) }}
                className={this.props.className}
            >
                <Table
                    style={styles.table}
                    aria-label="simple table"
                    size="small"
                    stickyHeader
                >
                    {this.renderHead()}
                    <TableBody>{table.map(item => this.renderLine(item))}</TableBody>
                </Table>
            </div>
        );
    }
}
